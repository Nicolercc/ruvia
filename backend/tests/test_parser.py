from __future__ import annotations

from io import BytesIO

import pytest
from docx import Document
from pypdf import PdfWriter
from reportlab.pdfgen import canvas

from app.config import MAX_FILE_BYTES
from app.errors import RuviaError
from app.parser import DocumentParser


def make_pdf(text: str) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.save()
    return buffer.getvalue()


def make_docx(text: str) -> bytes:
    buffer = BytesIO()
    document = Document()
    document.add_paragraph(text)
    document.save(buffer)
    return buffer.getvalue()


def make_encrypted_pdf() -> bytes:
    buffer = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.encrypt("secret")
    writer.write(buffer)
    return buffer.getvalue()


def test_parse_pdf_and_docx() -> None:
    parser = DocumentParser()

    pdf_doc = parser.parse("resume.pdf", "application/pdf", make_pdf("Built SQL dashboards."))
    docx_doc = parser.parse(
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        make_docx("Presented insights to Finance."),
    )

    assert "SQL dashboards" in pdf_doc.text
    assert "Presented insights" in docx_doc.text
    assert pdf_doc.character_count > 0
    assert docx_doc.character_count > 0


@pytest.mark.parametrize(
    ("filename", "content", "error_code"),
    [
        ("resume.txt", b"hello", "unsupported_file_type"),
        ("resume.pdf", b"", "empty_file"),
        ("resume.pdf", b"x" * (MAX_FILE_BYTES + 1), "file_too_large"),
        ("resume.pdf", b"not a pdf", "disguised_file"),
        ("resume.docx", b"not a docx", "disguised_file"),
    ],
)
def test_reject_invalid_files(filename: str, content: bytes, error_code: str) -> None:
    parser = DocumentParser()

    with pytest.raises(RuviaError) as exc:
        parser.parse(filename, None, content)

    assert exc.value.error_code == error_code


def test_reject_password_protected_pdf() -> None:
    parser = DocumentParser()

    with pytest.raises(RuviaError) as exc:
        parser.parse("locked.pdf", "application/pdf", make_encrypted_pdf())

    assert exc.value.error_code == "password_protected_pdf"
