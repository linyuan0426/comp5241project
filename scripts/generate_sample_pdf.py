#!/usr/bin/env python3
"""Generate the self-contained PDF used by the learning demo."""

from pathlib import Path
from sys import argv

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


NAVY = colors.HexColor("#102A4C")
BLUE = colors.HexColor("#1769E0")
SKY = colors.HexColor("#EAF3FF")
INK = colors.HexColor("#263B58")
MUTED = colors.HexColor("#687A92")
LINE = colors.HexColor("#DCE5F0")
GREEN = colors.HexColor("#0A8D70")


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#F7FAFD"))
    canvas.rect(0, 0, width, height, fill=1, stroke=0)

    canvas.setFillColor(NAVY)
    canvas.roundRect(18 * mm, height - 22 * mm, 12 * mm, 8 * mm, 2 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawCentredString(24 * mm, height - 19.4 * mm, "P")

    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(33 * mm, height - 18.8 * mm, "PATHWISE COURSE NOTES")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(width - 18 * mm, height - 18.8 * mm, "SOFTWARE ENGINEERING FOUNDATIONS")

    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.7)
    canvas.line(18 * mm, height - 25 * mm, width - 18 * mm, height - 25 * mm)
    canvas.line(18 * mm, 18 * mm, width - 18 * mm, 18 * mm)

    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 12 * mm, "A compact source for the Pathwise learning demo")
    canvas.drawRightString(width - 18 * mm, 12 * mm, f"{doc.page:02d}")
    canvas.restoreState()


def callout(text, background, accent):
    box = Paragraph(
        text,
        ParagraphStyle(
            "Callout",
            fontName="Helvetica",
            fontSize=9,
            leading=14,
            textColor=INK,
        ),
    )
    table = Table([[box]], colWidths=[164 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.6, accent),
                ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return table


def build_pdf(destination: Path):
    destination.parent.mkdir(parents=True, exist_ok=True)
    base = getSampleStyleSheet()

    title = ParagraphStyle(
        "CourseTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=30,
        leading=34,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=12,
    )
    deck = ParagraphStyle(
        "Deck",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=12,
        leading=19,
        textColor=MUTED,
        spaceAfter=18,
    )
    section = ParagraphStyle(
        "Section",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=23,
        textColor=NAVY,
        spaceBefore=8,
        spaceAfter=10,
    )
    heading = ParagraphStyle(
        "Heading",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=BLUE,
        spaceBefore=10,
        spaceAfter=5,
    )
    body = ParagraphStyle(
        "Body",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=15.5,
        textColor=INK,
        spaceAfter=8,
    )
    bullet = ParagraphStyle(
        "Bullet",
        parent=body,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4,
    )
    label = ParagraphStyle(
        "Label",
        parent=base["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=BLUE,
        spaceAfter=4,
    )

    document = SimpleDocTemplate(
        str(destination),
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=34 * mm,
        bottomMargin=25 * mm,
        title="Software Engineering Foundations",
        author="Pathwise AI Learning Lab",
        subject="A compact software engineering course for an AI learning demo",
    )

    story = [
        Spacer(1, 14 * mm),
        Paragraph("Software Engineering Foundations", title),
        Paragraph(
            "From source code to reliable systems: a practical guide to version control, "
            "functions, testing, and API contracts.",
            deck,
        ),
        callout(
            "<b>Course goal</b><br/>Learn how small engineering decisions combine into "
            "software that is understandable, testable, and safe to change.",
            SKY,
            BLUE,
        ),
        Spacer(1, 16 * mm),
        Paragraph("WHAT YOU WILL PRACTICE", label),
        Paragraph(
            "You will trace a change from an isolated Git branch through a small function, "
            "an automated test, and a stable API response. Each section introduces one "
            "boundary that helps teams reason about a larger system.",
            body,
        ),
        Spacer(1, 6 * mm),
        Paragraph("01  Source control makes change visible", section),
        Paragraph(
            "A version-controlled project records not only the current files but also the "
            "history of decisions that produced them. A branch gives an engineer a safe "
            "place to explore a change without disrupting the shared main branch. Small, "
            "focused commits create a readable trail from a bug report to its fix.",
            body,
        ),
        Paragraph("• Create a branch for one concern instead of mixing unrelated edits.", bullet),
        Paragraph("• Write commit messages that explain intent, not just file changes.", bullet),
        Paragraph("• Review the diff before merging so accidental changes remain visible.", bullet),
        callout(
            "<b>Rule of thumb</b><br/>If a commit is difficult to describe in one sentence, "
            "it probably contains more than one logical change.",
            colors.HexColor("#F0FBF7"),
            GREEN,
        ),
        PageBreak(),
        Paragraph("02  Functions create useful boundaries", section),
        Paragraph(
            "A function should have a clear responsibility, explicit inputs, and a result "
            "that another part of the program can trust. Keeping calculation separate from "
            "input and output makes the calculation easier to test. Pure functions are "
            "especially useful because the same inputs always produce the same result and "
            "they do not hide state changes.",
            body,
        ),
        Paragraph("GOOD BOUNDARY CHECKLIST", label),
        Paragraph("• Does the function name describe one observable outcome?", bullet),
        Paragraph("• Are invalid inputs handled close to the boundary?", bullet),
        Paragraph("• Can the core logic run without a browser, network, or database?", bullet),
        Paragraph(
            "Errors are part of an interface. A function that can fail should communicate "
            "that failure in a predictable way. Returning a clear validation error is often "
            "better than allowing an invalid value to travel deeper into the application.",
            body,
        ),
        callout(
            "<b>Example</b><br/><font name='Courier'>parseScore(input) -&gt; score</font> should "
            "either return a valid number from 0 to 100 or raise a specific invalid-input "
            "error. Callers can then choose how to present the problem.",
            colors.HexColor("#F7F9FD"),
            NAVY,
        ),
        Spacer(1, 5 * mm),
        Paragraph("03  Tests turn expectations into feedback", section),
        Paragraph(
            "An automated test describes a behavior the team wants to preserve. The arrange, "
            "act, assert pattern makes the scenario readable: prepare input, execute the "
            "operation, and compare the result with the expected outcome. A failing test is "
            "valuable evidence because it narrows the search to a specific contract.",
            body,
        ),
        Paragraph("PRACTICAL TESTING SEQUENCE", label),
        Paragraph("1. Reproduce the smallest failing case.", bullet),
        Paragraph("2. Fix the cause rather than weakening the assertion.", bullet),
        Paragraph("3. Re-run related tests to catch regressions.", bullet),
        PageBreak(),
        Paragraph("04  APIs communicate contracts", section),
        Paragraph(
            "An API response is more than data: it is a promise about field names, types, "
            "status codes, and failure behavior. Client code should validate what it receives "
            "before trusting that shape. A schema check turns a vague integration failure into "
            "a useful, local error message.",
            body,
        ),
        Paragraph("A RELIABLE API CONTRACT SPECIFIES", label),
        Paragraph("• The request fields that are required and their accepted types.", bullet),
        Paragraph("• The successful response shape and the meaning of each field.", bullet),
        Paragraph("• How authentication, rate limits, and server failures are reported.", bullet),
        Paragraph(
            "Status codes help different layers react appropriately. For example, a 401 response "
            "usually means credentials must be corrected, while a 429 response means the client "
            "should slow down and retry later. Treating every failure as a generic network error "
            "hides information the user needs.",
            body,
        ),
        Spacer(1, 7 * mm),
        Paragraph("Review before shipping", section),
        Paragraph(
            "Check the change against four questions: Is the intent visible in the diff? Does "
            "the core function have a clear contract? Do tests cover the expected and failing "
            "paths? Can the consumer identify and recover from an API error? These checks are "
            "small, repeatable habits that make software easier to evolve.",
            body,
        ),
        callout(
            "<b>Key takeaway</b><br/>Good engineering reduces uncertainty at every boundary: "
            "between versions, between functions, between tests and behavior, and between "
            "services.",
            SKY,
            BLUE,
        ),
        Spacer(1, 8 * mm),
        Paragraph("Terms to remember", heading),
        Paragraph(
            "<b>Branch:</b> an independent line of development. <b>Pure function:</b> a "
            "function whose result depends only on its inputs. <b>Regression test:</b> a test "
            "that protects an existing behavior after a change. <b>Contract:</b> the agreed "
            "inputs, outputs, and failure modes of an interface.",
            body,
        ),
    ]

    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)


if __name__ == "__main__":
    output = Path(argv[1]) if len(argv) > 1 else Path("public/sample-course.pdf")
    build_pdf(output)
    print(output)
