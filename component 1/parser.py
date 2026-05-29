from __future__ import annotations

import re
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_ASSET_DIR = PROJECT_ROOT / "component 1" / "image_questions"
IMS_FILEBASE = "$IMS-CC-FILEBASE$/"

IMG_TAG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
ATTR_RE = re.compile(r"""([\w:-]+)\s*=\s*(['"])(.*?)\2""")


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in element if _local_name(child.tag) == name]


def _descendants(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in element.iter() if _local_name(child.tag) == name]


def _first_descendant(element: ET.Element, name: str) -> ET.Element | None:
    return next((child for child in element.iter() if _local_name(child.tag) == name), None)


def _first_path(element: ET.Element, names: list[str]) -> ET.Element | None:
    current = element
    for name in names:
        current = next((child for child in current.iter() if _local_name(child.tag) == name), None)
        if current is None:
            return None
    return current


def _text(element: ET.Element | None, default: str = "") -> str:
    return (element.text or default).strip() if element is not None else default


def _number(value: str | None, default: float = 0.0) -> float:
    try:
        return float(value) if value else default
    except ValueError:
        return default


def _integer(value: str | None, default: int = 1) -> int:
    try:
        return int(value) if value else default
    except ValueError:
        return default


def _read_xml(zip_file: zipfile.ZipFile, href: str) -> ET.Element:
    with zip_file.open(href) as file:
        return ET.parse(file).getroot()


def _copy_zip_asset(zip_file: zipfile.ZipFile, source_href: str, file_path: str) -> None:
    if source_href not in zip_file.namelist():
        print(f"[!] Warning: image asset not found in package: {source_href}")
        return

    destination = PUBLIC_ASSET_DIR / file_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zip_file.open(source_href) as source, destination.open("wb") as target:
        shutil.copyfileobj(source, target)


def _image_attrs(img_tag: str) -> dict[str, str]:
    return {match.group(1).lower(): match.group(3) for match in ATTR_RE.finditer(img_tag)}


def _asset_paths(src: str) -> tuple[str, str, str] | None:
    clean_src = src.split("?", 1)[0]
    if clean_src.startswith(IMS_FILEBASE):
        file_path = clean_src.removeprefix(IMS_FILEBASE)
        return f"web_resources/{file_path}", file_path, f"/{file_path}"

    if clean_src.startswith("web_resources/"):
        file_path = clean_src.removeprefix("web_resources/")
        return clean_src, file_path, f"/{file_path}"

    return None


def _rewrite_question_images(question_text: str, zip_file: zipfile.ZipFile) -> tuple[str, list[dict[str, str | None]]]:
    images = []

    def replace_src(match: re.Match[str]) -> str:
        img_tag = match.group(0)
        attrs = _image_attrs(img_tag)
        original_src = attrs.get("src")
        if not original_src:
            return img_tag

        paths = _asset_paths(original_src)
        if paths is None:
            return img_tag

        source_href, file_path, public_src = paths
        _copy_zip_asset(zip_file, source_href, file_path)
        images.append(
            {
                "original_src": original_src,
                "file_path": file_path,
                "alt_text": attrs.get("alt"),
            }
        )
        return re.sub(r"""src\s*=\s*(['"]).*?\1""", f'src="{public_src}"', img_tag, count=1)

    return IMG_TAG_RE.sub(replace_src, question_text), images


def _first_file_href(resource: ET.Element) -> str | None:
    file_element = next(iter(_children(resource, "file")), None)
    return file_element.get("href") if file_element is not None else None


def _resource_meta_href(resource: ET.Element, resources_by_id: dict[str, ET.Element], qti_href: str) -> str:
    dependency = next(iter(_children(resource, "dependency")), None)
    if dependency is not None:
        dependency_resource = resources_by_id.get(dependency.get("identifierref", ""))
        if dependency_resource is not None:
            meta_href = dependency_resource.get("href") or _first_file_href(dependency_resource)
            if meta_href:
                return meta_href

    return str(PurePosixPath(qti_href).parent / "assessment_meta.xml")


def parse_canvas_quiz_zip(zip_path: str | Path) -> list[dict[str, Any]]:
    zip_path = Path(zip_path)
    if not zip_path.exists():
        raise SystemExit(f"Error: ZIP file not found at '{zip_path}'")

    print(f"[*] Parsing Canvas quiz package: {zip_path}")

    with zipfile.ZipFile(zip_path) as zip_file:
        names = set(zip_file.namelist())
        if "imsmanifest.xml" not in names:
            raise SystemExit("Error: package does not contain imsmanifest.xml.")

        manifest = _read_xml(zip_file, "imsmanifest.xml")
        resources = _descendants(manifest, "resource")
        resources_by_id = {resource.get("identifier", ""): resource for resource in resources}
        qti_resources = [resource for resource in resources if resource.get("type") == "imsqti_xmlv1p2"]

        if not qti_resources:
            print("[-] No QTI quiz resources found in imsmanifest.xml.", file=sys.stderr)
            return []

        quizzes = []
        for resource in qti_resources:
            qti_href = _first_file_href(resource)
            if not qti_href:
                continue

            meta_href = _resource_meta_href(resource, resources_by_id, qti_href)
            print(f"[+] Found quiz resource: {resource.get('identifier')}")
            print(f"    QTI XML:  {qti_href}")
            print(f"    Meta XML: {meta_href}")

            quiz = parse_quiz_qti_and_meta(zip_file, qti_href, meta_href)
            if quiz:
                quizzes.append(quiz)

    return quizzes


def parse_quiz_qti_and_meta(
    zip_file: zipfile.ZipFile,
    qti_href: str,
    meta_href: str,
) -> dict[str, Any] | None:
    try:
        qti_root = _read_xml(zip_file, qti_href)
    except Exception as exc:
        print(f"[-] Failed to read QTI file '{qti_href}': {exc}", file=sys.stderr)
        return None

    assessment = _first_descendant(qti_root, "assessment")
    if assessment is None:
        print(f"[-] QTI file '{qti_href}' does not contain an assessment tag.", file=sys.stderr)
        return None

    quiz = {
        "id": assessment.get("ident"),
        "title": assessment.get("title") or "Untitled quiz",
        "description": "",
        "points_possible": 0.0,
        "allowed_attempts": 1,
    }
    quiz.update(_parse_metadata(zip_file, meta_href))

    questions = [_parse_question(item, zip_file) for item in _descendants(qti_root, "item")]
    print(
        f"    Quiz Details -> Title: {quiz['title']!r}, "
        f"Points: {quiz['points_possible']}, Attempts: {quiz['allowed_attempts']}"
    )
    print(f"    Extracted {len(questions)} questions successfully.")

    return {**quiz, "questions": questions}


def _parse_metadata(zip_file: zipfile.ZipFile, meta_href: str) -> dict[str, Any]:
    if meta_href not in zip_file.namelist():
        return {}

    try:
        meta_root = _read_xml(zip_file, meta_href)
    except Exception as exc:
        print(f"[!] Warning: failed to parse metadata file '{meta_href}': {exc}. Using QTI defaults.")
        return {}

    metadata: dict[str, Any] = {}
    for key in ("title", "description"):
        value = _text(_first_descendant(meta_root, key))
        if value:
            metadata[key] = value

    points = _text(_first_descendant(meta_root, "points_possible"))
    attempts = _text(_first_descendant(meta_root, "allowed_attempts"))
    if points:
        metadata["points_possible"] = _number(points)
    if attempts:
        metadata["allowed_attempts"] = _integer(attempts)

    return metadata


def _metadata_fields(item: ET.Element) -> dict[str, str]:
    fields = {}
    for field in _descendants(item, "qtimetadatafield"):
        label = _text(_first_descendant(field, "fieldlabel"))
        entry = _text(_first_descendant(field, "fieldentry"))
        if label:
            fields[label] = entry
    return fields


def _parse_question(item: ET.Element, zip_file: zipfile.ZipFile) -> dict[str, Any]:
    metadata = _metadata_fields(item)
    correct_ids = {
        _text(varequal)
        for condition in _descendants(item, "conditionvar")
        for varequal in _descendants(condition, "varequal")
        if _text(varequal)
    }

    choices = []
    for label in _descendants(item, "response_label"):
        choice_id = label.get("ident")
        choices.append(
            {
                "id": choice_id,
                "text": _text(_first_descendant(label, "mattext")),
                "is_correct": choice_id in correct_ids,
            }
        )

    question_text = _text(_first_path(item, ["presentation", "material", "mattext"]))
    question_text, images = _rewrite_question_images(question_text, zip_file)
    return {
        "id": item.get("ident"),
        "title": item.get("title") or "Untitled question",
        "question_type": metadata.get("question_type", "multiple_choice_question"),
        "points_possible": _number(metadata.get("points_possible"), 1.0),
        "question_text": question_text,
        "images": images,
        "choices": choices,
    }
