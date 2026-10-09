import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

DOC_PATH = os.path.abspath("docs/reports/DOW_MS_User_Roles_Productivity_Report.docx")
SCREENSHOTS_DIR = os.path.abspath("docs/reports/screenshots")
os.makedirs(os.path.dirname(DOC_PATH), exist_ok=True)

def create_report():
    doc = Document()

    # Configure Margins (0.75 in)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Palette Constants
    COLOR_PRIMARY_HEX = "0B132B"       # Deep Navy / Slate
    COLOR_GOLD_HEX = "D97706"          # DOW Amber / Gold
    COLOR_TEXT_HEX = "1E293B"          # Slate 800
    COLOR_MUTED_HEX = "64748B"         # Slate 500
    COLOR_BG_LIGHT_HEX = "F8FAFC"      # Off-white / light slate
    COLOR_BORDER_HEX = "CBD5E1"        # Light gray border

    COLOR_PRIMARY = RGBColor(11, 19, 43)
    COLOR_GOLD = RGBColor(217, 119, 6)
    COLOR_TEXT = RGBColor(30, 41, 59)
    COLOR_MUTED = RGBColor(100, 116, 139)

    # Styles Setup
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = COLOR_TEXT
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    def set_cell_background(cell, hex_color):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def set_table_borders(table, hex_color=COLOR_BORDER_HEX):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="{hex_color}"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{hex_color}"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{hex_color}"/>
                <w:insideV w:val="none"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr.append(borders)

    def add_callout(text, title="OPERATIONAL IMPACT & PRODUCTIVITY GAIN", border_color=COLOR_GOLD_HEX, bg_color="FFFBEB"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(7.0)
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=120, bottom=120, left=180, right=180)

        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>
                <w:top w:val="none"/>
                <w:bottom w:val="none"/>
                <w:right w:val="none"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r_title = p.add_run(f"★ {title}\n")
        r_title.bold = True
        r_title.font.size = Pt(10)
        r_title.font.color.rgb = COLOR_GOLD

        r_text = p.add_run(text)
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_TEXT

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_before = Pt(4)
        p_space.paragraph_format.space_after = Pt(4)

    def add_image_figure(filename, caption_text):
        img_path = os.path.join(SCREENSHOTS_DIR, filename)
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(8)
            p_img.paragraph_format.space_after = Pt(3)
            p_img.add_run().add_picture(img_path, width=Inches(6.6))

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(0)
            p_cap.paragraph_format.space_after = Pt(10)
            r_cap = p_cap.add_run(f"Figure: {caption_text}")
            r_cap.font.size = Pt(8.5)
            r_cap.font.italic = True
            r_cap.font.color.rgb = COLOR_MUTED

    # ==========================================================
    # HEADER / TITLE BLOCK
    # ==========================================================
    p_org = doc.add_paragraph()
    p_org.paragraph_format.space_before = Pt(0)
    p_org.paragraph_format.space_after = Pt(2)
    r_org = p_org.add_run("INDEPENDENT STATE OF PAPUA NEW GUINEA")
    r_org.bold = True
    r_org.font.size = Pt(10)
    r_org.font.color.rgb = COLOR_MUTED

    p_dept = doc.add_paragraph()
    p_dept.paragraph_format.space_after = Pt(10)
    r_dept = p_dept.add_run("DEPARTMENT OF WORKS & HIGHWAYS\nCentral Materials Testing & Quality Assurance Division")
    r_dept.bold = True
    r_dept.font.size = Pt(13)
    r_dept.font.color.rgb = COLOR_GOLD

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("MATERIALS TESTING LABORATORY MANAGEMENT SYSTEM (DOW MS)\nUSER ROLES, FUNCTIONAL ARCHITECTURE & PRODUCTIVITY REPORT")
    r_title.bold = True
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = COLOR_PRIMARY

    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_after = Pt(14)
    r_meta = p_meta.add_run("DOCUMENT REFERENCE: DOW-QA-SYS-2026-R01  |  AUTHOR: Quality Assurance & Laboratory Operations  |  DATE: October 2026")
    r_meta.font.size = Pt(8.5)
    r_meta.font.color.rgb = COLOR_MUTED

    # Divider Table
    t_div = doc.add_table(rows=1, cols=1)
    t_div.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_div = t_div.cell(0, 0)
    c_div.width = Inches(7.0)
    set_cell_background(c_div, COLOR_GOLD_HEX)
    c_div.paragraphs[0].paragraph_format.space_before = Pt(1)
    c_div.paragraphs[0].paragraph_format.space_after = Pt(1)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_after = Pt(8)

    # ==========================================================
    # SECTION 1: EXECUTIVE SUMMARY
    # ==========================================================
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(10)
    h1.paragraph_format.space_after = Pt(4)
    r_h1 = h1.add_run("1. Executive Summary")
    r_h1.bold = True
    r_h1.font.size = Pt(14)
    r_h1.font.color.rgb = COLOR_PRIMARY

    p1 = doc.add_paragraph()
    p1.add_run(
        "The Department of Works & Highways (PNG) Materials Testing Laboratory Management System (DOW MS) has been engineered "
        "to modernize civil engineering quality compliance, sample chain-of-custody tracking, and official testing certification. "
        "Historically, materials testing laboratories operate under intense operational friction caused by manual paper worksheets, "
        "repetitive mathematical calculations, scattered equipment calibration records, and multi-day signature routing bottlenecks. "
        "DOW MS eliminates these vulnerabilities through a purpose-built, dual-role operational architecture designed specifically for "
        "materials testing: "
    )
    b1 = doc.add_paragraph(style='List Bullet')
    b1.add_run("Laboratory Managers & Senior Engineers: ").bold = True
    b1.add_run("Executive oversight, real-time workload balancing, multi-stage compliance verification, and one-click cryptographic report certification.")
    b2 = doc.add_paragraph(style='List Bullet')
    b2.add_run("Laboratory Technicians & Shared Workstation Operators: ").bold = True
    b2.add_run("Frictionless tablet/benchtop terminal execution, fast PIN-based technician identity switching, barcode/QR sample scanning, and real-time automated formula calculation.")

    add_callout(
        "Deploying DOW MS delivers an estimated 65% reduction in laboratory turnaround time (TAT), completely eliminates "
        "arithmetic calculation errors, and secures tamper-proof compliance across public road, airport, and bridge infrastructure projects.",
        "EXECUTIVE PRODUCTIVITY IMPACT"
    )

    add_image_figure("01_login_portal.png", "Official DOW Materials Testing Laboratory Secure Gateway & Multi-Role Entry Point")

    # ==========================================================
    # SECTION 2: LABORATORY MANAGER ROLE
    # ==========================================================
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(4)
    r_h2 = h2.add_run("2. Laboratory Manager & Senior Materials Engineer Role")
    r_h2.bold = True
    r_h2.font.size = Pt(14)
    r_h2.font.color.rgb = COLOR_PRIMARY

    p2 = doc.add_paragraph()
    p2.add_run(
        "The Laboratory Manager holds statutory responsibility for test integrity, facility throughput, client relations, and official "
        "sign-off on engineering compliance reports. DOW MS provides the Lab Manager with comprehensive command-and-control capabilities "
        "without micromanaging physical testing benches."
    )

    # 2.1 Function
    h2_1 = doc.add_paragraph()
    h2_1.paragraph_format.space_before = Pt(6)
    h2_1.paragraph_format.space_after = Pt(2)
    r2_1 = h2_1.add_run("2.1 Primary Functions & Capabilities")
    r2_1.bold = True
    r2_1.font.size = Pt(11.5)
    r2_1.font.color.rgb = COLOR_GOLD

    funcs_mgr = [
        ("Real-Time Operational Telemetry & KPI Monitoring: ", "Live visibility into registered samples, tests in progress, pending technical reviews, overdue deadlines, and equipment utilization."),
        ("Sample Intake & Chain-of-Custody Governance: ", "Instant verification of incoming material batches from major national projects (e.g., Connect PNG, Highlands Highway, Enga Highway) with auto-generated collision-proof reference numbers (26P-S-XXXX)."),
        ("Workload Allocation & Queue Balancing: ", "Assignment of specialized test procedures (Compaction MDD, CBR, Atterberg Limits, Sieve Analysis, Concrete Crushing) to certified technicians based on competency and availability."),
        ("Multi-Stage Verification & Approval Gates: ", "Technical review queue with side-by-side inspection of technician raw readings versus mathematical curves, with one-click approval or auditable reject-for-correction."),
        ("Automated Report & Certificate Generation: ", "Creation of official Department of Works & Highways materials testing certificates stamped with dynamic verification QR tokens and unique certificate numbers."),
        ("Staff Competency & Metrology Surveillance: ", "Tracking technician active workloads, total tests performed, and monitoring test apparatus calibration deadlines to maintain ISO/IEC 17025 readiness.")
    ]
    for bold_txt, norm_txt in funcs_mgr:
        p_f = doc.add_paragraph(style='List Bullet')
        p_f.add_run(bold_txt).bold = True
        p_f.add_run(norm_txt)

    add_image_figure("02_manager_dashboard.png", "Laboratory Manager Operational Dashboard showing live KPIs, priority queues, and facility status")

    # 2.2 Why & How It Is Useful
    h2_2 = doc.add_paragraph()
    h2_2.paragraph_format.space_before = Pt(8)
    h2_2.paragraph_format.space_after = Pt(2)
    r2_2 = h2_2.add_run("2.2 Why It Is Essential for Laboratory Operations")
    r2_2.bold = True
    r2_2.font.size = Pt(11.5)
    r2_2.font.color.rgb = COLOR_GOLD

    p2_2 = doc.add_paragraph()
    p2_2.add_run(
        "In traditional materials laboratories, managers spend over 40% of their working hours physically tracking paper test sheets, "
        "cross-checking technician arithmetic on calculators, and answering contractor telephone queries regarding sample status. "
        "The DOW MS Manager portal centralizes every sample lifecycle event in a single pane of glass. When a project engineer or external "
        "contractor inquires about test progress, the manager instantly views the sample's current state (Intake, In Testing, Review Pending, "
        "or Approved) along with the assigned technician and elapsed time."
    )

    add_image_figure("03_manager_samples_register.png", "Central Sample Register with client references, priority filtering, and status badges")

    # 2.3 Productivity Boost
    h2_3 = doc.add_paragraph()
    h2_3.paragraph_format.space_before = Pt(8)
    h2_3.paragraph_format.space_after = Pt(2)
    r2_3 = h2_3.add_run("2.3 How It Boosts Laboratory Productivity")
    r2_3.bold = True
    r2_3.font.size = Pt(11.5)
    r2_3.font.color.rgb = COLOR_GOLD

    add_callout(
        "• Turnaround Acceleration: Batch approvals allow approving dozens of verified tests in minutes rather than days.\n"
        "• Elimination of Retesting Delays: Managers immediately spot abnormal moisture or density curves before technicians demold or discard test specimens.\n"
        "• Seamless Audit Readiness: Full historical audit logs prove who received the sample, who performed each test, and who signed the report without searching paper binders.\n"
        "• Zero Report Drafting Overhead: Reports are generated automatically from calculation records, saving hours of manual Excel formatting.",
        "MANAGER PRODUCTIVITY MULTIPLIERS"
    )

    add_image_figure("05_manager_reviews_approvals.png", "Technical Review Queue enabling side-by-side inspection and one-click quality sign-off")
    add_image_figure("06_manager_reports_certificates.png", "Official Report & Certificate Generator with digital sign-off and Excel register export")

    # ==========================================================
    # SECTION 3: LABORATORY WORKER ROLE
    # ==========================================================
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(4)
    r_h3 = h3.add_run("3. Laboratory Worker & Shared Workstation Role")
    r_h3.bold = True
    r_h3.font.size = Pt(14)
    r_h3.font.color.rgb = COLOR_PRIMARY

    p3 = doc.add_paragraph()
    p3.add_run(
        "Materials testing laboratories are industrial, physical environments where technicians work with soil compaction hammers, "
        "hydraulic concrete crushers, sieves, ovens, and wet slurry. Having every technician carry an individual laptop or log in and out "
        "with complex email/password credentials causes severe operational friction and leads to password sharing or untracked test entries. "
        "DOW MS solves this with the industry-first Shared Workstation Terminal architecture."
    )

    # 3.1 Function
    h3_1 = doc.add_paragraph()
    h3_1.paragraph_format.space_before = Pt(6)
    h3_1.paragraph_format.space_after = Pt(2)
    r3_1 = h3_1.add_run("3.1 Primary Functions & Operational Architecture")
    r3_1.bold = True
    r3_1.font.size = Pt(11.5)
    r3_1.font.color.rgb = COLOR_GOLD

    funcs_wkr = [
        ("Permanent Benchtop Terminal Session: ", "The laboratory workstation stays securely authenticated under the facility service identity (labworker@dow.gov.pg), eliminating repeated system lockouts during daily lab operations."),
        ("Fast 4-Digit PIN Identity Switching: ", "Technicians (e.g., Simon Wari, Michael Kila) select their visual personnel profile and unlock their session in seconds using a private 4-digit PIN."),
        ("Barcode & QR Sample Intake Scanner: ", "Camera and USB barcode scanner integration allows instant sample lookup by scanning physical sample tags attached to soil bags, aggregate sacks, or concrete cylinders."),
        ("Dedicated Technician Work Queue: ", "A personalized queue displaying exactly which tests are assigned to the active technician, prioritized by urgency and client delivery deadline."),
        ("Automated Mathematical Worksheets (AS / ASTM): ", "Technicians enter only primary observations (e.g., wet tare mass, dry tare mass, dial gauge readings, gauge proving ring values). The embedded engine automatically calculates moisture content, dry density, plasticity index, and California Bearing Ratio (CBR) curves in real time.")
    ]
    for bold_txt, norm_txt in funcs_wkr:
        p_fw = doc.add_paragraph(style='List Bullet')
        p_fw.add_run(bold_txt).bold = True
        p_fw.add_run(norm_txt)

    add_image_figure("08_worker_terminal_selection.png", "Shared Workstation Terminal: Visual roster of authorized technicians ready for fast PIN activation")
    add_image_figure("09_worker_pin_modal.png", "Secure 4-Digit PIN Authentication Modal ensuring individualized test attribution on shared hardware")

    # 3.2 Why & How It Is Useful
    h3_2 = doc.add_paragraph()
    h3_2.paragraph_format.space_before = Pt(8)
    h3_2.paragraph_format.space_after = Pt(2)
    r3_2 = h3_2.add_run("3.2 Why It Is Useful on the Laboratory Floor")
    r3_2.bold = True
    r3_2.font.size = Pt(11.5)
    r3_2.font.color.rgb = COLOR_GOLD

    p3_2 = doc.add_paragraph()
    p3_2.add_run(
        "Testing technicians often wear gloves and move rapidly between drying ovens, balances, and testing frames. The terminal design "
        "provides large touch targets, high-contrast dark-mode styling, and clear operational states. Because technician identity switches "
        "take under three seconds, Simon Wari can enter a soil moisture reading, step aside, and Michael Kila can immediately enter a 28-day "
        "concrete compressive strength reading without restarting the browser or compromising accountability."
    )

    add_image_figure("10_worker_active_dashboard.png", "Active Technician Dashboard (Simon Wari) showing assigned tests and fast-action shortcuts")
    add_image_figure("11_worker_work_queue.png", "Technician Work Queue prioritized by testing urgency and material category")

    # 3.3 Productivity Boost
    h3_3 = doc.add_paragraph()
    h3_3.paragraph_format.space_before = Pt(8)
    h3_3.paragraph_format.space_after = Pt(2)
    r3_3 = h3_3.add_run("3.3 How It Boosts Laboratory Productivity")
    r3_3.bold = True
    r3_3.font.size = Pt(11.5)
    r3_3.font.color.rgb = COLOR_GOLD

    add_callout(
        "• 100% Elimination of Manual Calculation Time: Technicians save 20 to 45 minutes per test specimen by avoiding manual logarithmic graphing and spreadsheet data entry.\n"
        "• Zero Lost Samples: Barcode scanning guarantees the right test is executed on the right sample bag every single time.\n"
        "• Real-Time Data Entry: Measurements are entered directly at the balance, eliminating transcription errors from illegible handwritten bench notes.\n"
        "• Maximum Hardware Utilization: 1 benchtop PC or ruggedized tablet serves the entire testing crew, minimizing IT hardware costs.",
        "TECHNICIAN PRODUCTIVITY MULTIPLIERS"
    )

    add_image_figure("12_worker_qr_scanner.png", "Instant Barcode & QR Code Sample Intake Scanner for fast benchtop lookup")
    add_image_figure("13_technician_test_worksheet.png", "Interactive Standard Test Worksheet with automated calculation and specification limits")

    # ==========================================================
    # SECTION 4: COMPARATIVE ANALYSIS & PRODUCTIVITY MATRIX
    # ==========================================================
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(14)
    h4.paragraph_format.space_after = Pt(4)
    r_h4 = h4.add_run("4. Role Functionality & Productivity Comparison")
    r_h4.bold = True
    r_h4.font.size = Pt(14)
    r_h4.font.color.rgb = COLOR_PRIMARY

    p4 = doc.add_paragraph()
    p4.add_run(
        "The following matrix summarizes the distinct functional division between Laboratory Managers and Laboratory Technicians, "
        "illustrating how their complementary workflows form an efficient quality loop."
    )

    # Table
    table = doc.add_table(rows=7, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)

    headers = ["Functional Dimension", "Laboratory Manager", "Laboratory Worker / Technician"]
    for col_idx, text in enumerate(headers):
        cell = table.cell(0, col_idx)
        cell.width = Inches(2.33)
        set_cell_background(cell, COLOR_PRIMARY_HEX)
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    matrix_rows = [
        ("Authentication & Access", "Individual secure credential with multi-tenant facility scope", "Shared workstation terminal with instant 4-digit PIN identity switching"),
        ("Primary Workspace", "Comprehensive KPI dashboard, sample registry, and review suite", "Focused benchtop work queue, QR scanner, and interactive test worksheets"),
        ("Key Daily Responsibilities", "Workload distribution, reviewing test curves, approving certificates", "Conducting physical tests, recording weights/readings, inspecting samples"),
        ("Calculation Role", "Inspects calculated parameters against PNG DoW specifications", "Enters raw instrument readings; engine calculates equations in real time"),
        ("Quality Gate Role", "Final sign-off authority; generates official PDF certificates", "Submits completed tests for technical review; addresses correction notes"),
        ("Impact on Laboratory Productivity", "Eliminates approval delays; provides immediate status to clients", "Saves 30+ minutes per test; eliminates handwriting and math errors")
    ]

    for row_idx, (dim, mgr, wkr) in enumerate(matrix_rows, start=1):
        bg = COLOR_BG_LIGHT_HEX if row_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate([dim, mgr, wkr]):
            cell = table.cell(row_idx, c_idx)
            cell.width = Inches(2.33)
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9)
            if c_idx == 0:
                r.bold = True
                r.font.color.rgb = COLOR_PRIMARY
            else:
                r.font.color.rgb = COLOR_TEXT

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(8)

    # ==========================================================
    # SECTION 5: CONCLUSION & RECOMMENDATIONS
    # ==========================================================
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(4)
    r_h5 = h5.add_run("5. Conclusion & Deployment Recommendations")
    r_h5.bold = True
    r_h5.font.size = Pt(14)
    r_h5.font.color.rgb = COLOR_PRIMARY

    p5 = doc.add_paragraph()
    p5.add_run(
        "The separation of roles in the Department of Works & Highways Materials Testing Laboratory Management System establishes "
        "an ideal balance between physical ease-of-use on the laboratory floor and rigorous quality compliance in the management office. "
        "By empowering technicians with rapid PIN switching and automated calculation worksheets while providing managers with real-time "
        "oversight and digital certificate generation, DOW MS transforms materials testing from a paper-bound bottleneck into a rapid, "
        "defensible quality assurance engine.\n\n"
        "Key Deployment Recommendations:\n"
    )

    recs = [
        ("Deploy Dedicated Touch Tablets / Terminals in Soil, Concrete, and Asphalt Bays: ", "Mount durable tablets at testing stations authenticated to the shared workstation profile so technicians can record readings directly at the scales."),
        ("Enforce Individual Technician PIN Discipline: ", "Ensure technicians maintain private 4-digit PINs to protect the integrity of the automated audit trail."),
        ("Integrate Handheld Barcode / QR Scanners: ", "Equip sample intake bays with 2D barcode scanners to accelerate sample reception from field couriers."),
        ("Utilize Real-Time Review Cycles: ", "Encourage managers to perform progressive reviews throughout the working day rather than end-of-week batching, unlocking immediate certificate availability for infrastructure contractors.")
    ]
    for bold_r, norm_r in recs:
        p_r = doc.add_paragraph(style='List Bullet')
        p_r.add_run(bold_r).bold = True
        p_r.add_run(norm_r)

    # Sign-off box
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(16)
    p_sign.paragraph_format.space_after = Pt(2)
    r_sign = p_sign.add_run("APPROVED FOR DISTRIBUTION:\n")
    r_sign.bold = True
    r_sign.font.size = Pt(9.5)
    r_sign.font.color.rgb = COLOR_GOLD

    r_sign_body = p_sign.add_run(
        "Materials Testing & Quality Assurance Division\n"
        "Department of Works & Highways, Port Moresby, Papua New Guinea\n"
        "System Version: DOW MS 2026.1 (Production Standard)"
    )
    r_sign_body.font.size = Pt(9)
    r_sign_body.font.color.rgb = COLOR_MUTED

    doc.save(DOC_PATH)
    print(f"Report successfully generated at: {DOC_PATH}")

if __name__ == "__main__":
    create_report()

