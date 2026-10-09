import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.abspath("docs/reports/screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # ==========================================
        # 1. LAB MANAGER SESSIONS & WORKFLOWS
        # ==========================================
        print("Navigating to login page...")
        page.goto("http://localhost:3000/login", wait_until="networkidle")
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "01_login_portal.png"))
        print("Captured 01_login_portal.png")

        print("Logging in as Lab Manager (manager@dow.gov.pg)...")
        page.fill('input[type="email"]', "manager@dow.gov.pg")
        page.fill('input[type="password"]', "Password123!")
        page.click('button[type="submit"]')
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(3)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02_manager_dashboard.png"))
        print("Captured 02_manager_dashboard.png")

        # Manager - Samples Register & Chain of Custody
        page.goto("http://localhost:3000/samples", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "03_manager_samples_register.png"))
        print("Captured 03_manager_samples_register.png")

        # Manager - Testing Operations & Laboratory Test Statuses
        page.goto("http://localhost:3000/tests", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04_manager_tests_management.png"))
        print("Captured 04_manager_tests_management.png")

        # Manager - Technical Review & Verification Queue
        page.goto("http://localhost:3000/reviews", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "05_manager_reviews_approvals.png"))
        print("Captured 05_manager_reviews_approvals.png")

        # Manager - Official Reports, Certificates & QR Validation
        page.goto("http://localhost:3000/reports", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "06_manager_reports_certificates.png"))
        print("Captured 06_manager_reports_certificates.png")

        # Manager - Personnel Roster & Qualification Tracking
        page.goto("http://localhost:3000/personnel", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "07_manager_personnel.png"))
        print("Captured 07_manager_personnel.png")

        # ==========================================
        # 2. LAB WORKER / SHARED WORKSTATION SESSIONS
        # ==========================================
        print("Clearing session to authenticate Shared Workstation Terminal...")
        context.clear_cookies()
        page.evaluate("() => localStorage.clear()")
        page.goto("http://localhost:3000/login", wait_until="networkidle")
        time.sleep(1)

        print("Logging in as Lab Worker (labworker@dow.gov.pg)...")
        page.fill('input[type="email"]', "labworker@dow.gov.pg")
        page.fill('input[type="password"]', "Password123!")
        page.click('button[type="submit"]')
        page.wait_for_url("**/worker/select", timeout=15000)
        time.sleep(3)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "08_worker_terminal_selection.png"))
        print("Captured 08_worker_terminal_selection.png")

        # Click on Simon Wari card to open PIN modal
        print("Selecting Simon Wari (Senior Technician) to trigger PIN modal...")
        simon_card = page.locator("text=Simon Wari").first
        simon_card.click()
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "09_worker_pin_modal.png"))
        print("Captured 09_worker_pin_modal.png")

        # Enter PIN 1111 and submit
        print("Entering PIN 1111 for Simon Wari...")
        pin_input = page.locator('input[type="password"]').first
        pin_input.fill("1111")
        time.sleep(0.5)
        unlock_button = page.locator('button:has-text("Unlock Identity"), button:has-text("Verify & Unlock")').first
        if unlock_button.is_visible():
            unlock_button.click()
        else:
            page.keyboard.press("Enter")
        
        time.sleep(3)
        print("Current URL after PIN unlock:", page.url)

        # Worker Dashboard with active Simon Wari identity
        page.goto("http://localhost:3000/worker/dashboard", wait_until="networkidle")
        time.sleep(3)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "10_worker_active_dashboard.png"))
        print("Captured 10_worker_active_dashboard.png")

        # Technician Work Queue (Assigned Tests)
        page.goto("http://localhost:3000/work-queue", wait_until="networkidle")
        time.sleep(3)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "11_worker_work_queue.png"))
        print("Captured 11_worker_work_queue.png")

        # Sample Intake / QR Scanner Terminal
        page.goto("http://localhost:3000/samples/scan", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "12_worker_qr_scanner.png"))
        print("Captured 12_worker_qr_scanner.png")

        # Test Execution Worksheet (Pick first test if available)
        page.goto("http://localhost:3000/tests", wait_until="networkidle")
        time.sleep(2)
        # Find first test link
        first_test = page.locator('a[href^="/tests/"]').first
        if first_test.is_visible():
            test_href = first_test.get_attribute("href")
            if test_href:
                print(f"Navigating to worksheet: {test_href}")
                page.goto(f"http://localhost:3000{test_href}", wait_until="networkidle")
                time.sleep(2)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "13_technician_test_worksheet.png"))
                print("Captured 13_technician_test_worksheet.png")

        browser.close()
        print("All high-definition user workflow screenshots captured!")

if __name__ == "__main__":
    run()
