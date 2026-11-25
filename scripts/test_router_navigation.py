import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def run():
    print("=========================================================")
    print("🚀 LolaCloud Console Router & Navigation Engine Verification")
    print("=========================================================\n")

    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1440,900')
    options.binary_location = '/usr/bin/chromium'

    service = Service(executable_path='/usr/bin/chromedriver')
    driver = webdriver.Chrome(service=service, options=options)

    try:
        # TEST 1: Unauthenticated Guard Test
        print("▶ [Test 1] Testing Auth Guard redirection to /login...")
        driver.get('http://localhost:5173/lci/operators')
        driver.execute_script("localStorage.clear(); location.reload();")
        time.sleep(1.5)

        current_url = driver.current_url
        print(f"  - Loaded /lci/operators without auth -> Current URL: {current_url}")
        assert '/login' in current_url, f"❌ FAILED: Expected redirect to /login, got {current_url}"
        # Verify login form is visible
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Operator Sign In')]"))
        )
        print("  ✔ Confirmed: Unauthenticated access redirected to /login\n")

        # TEST 2: Authenticate via login flow
        print("▶ [Test 2] Authenticating as operator 'root'...")
        # Type credentials and submit
        username_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text']")
        if not username_inputs:
            username_inputs = driver.find_elements(By.TAG_NAME, "input")
        username_inputs[0].send_keys("root")

        password_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        password_inputs[0].send_keys("toor")

        submit_btn = driver.find_element(By.XPATH, "//button[contains(., 'Sign in to Console')]")
        submit_btn.click()
        time.sleep(1.5)

        print(f"  - Post-login URL: {driver.current_url}")
        assert driver.current_url.endswith('/'), f"❌ Expected '/', got {driver.current_url}"
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CLASS_NAME, "lola-top-navigation-header"))
        )
        print("  ✔ Confirmed: Login succeeded and redirected to '/' (HomeDashboard)\n")

        # TEST 3: Access /login when authenticated -> redirects to /
        print("▶ [Test 3] Testing access to /login when already authenticated...")
        driver.get('http://localhost:5173/login')
        time.sleep(1)
        print(f"  - Visited /login -> Current URL: {driver.current_url}")
        assert not driver.current_url.endswith('/login'), f"❌ Should redirect away from /login, got {driver.current_url}"
        print("  ✔ Confirmed: Authenticated visit to /login redirected to '/'\n")

        # TEST 4: Direct URL access to /lci -> redirects to /lci/dashboard
        print("▶ [Test 4] Testing direct URL access to /lci...")
        driver.get('http://localhost:5173/lci')
        time.sleep(1)
        print(f"  - Visited /lci -> Current URL: {driver.current_url}")
        assert '/lci/dashboard' in driver.current_url, f"❌ Expected /lci/dashboard, got {driver.current_url}"
        print("  ✔ Confirmed: /lci cleanly redirected to /lci/dashboard\n")

        # TEST 5: Direct URL access to /lci/operators
        print("▶ [Test 5] Testing direct URL access to /lci/operators...")
        driver.get('http://localhost:5173/lci/operators')
        time.sleep(1.5)
        print(f"  - Visited /lci/operators -> Current URL: {driver.current_url}")
        assert '/lci/operators' in driver.current_url, f"❌ Expected /lci/operators, got {driver.current_url}"
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Operators')] | //h2[contains(., 'Operators')]"))
        )
        # Check active side nav
        active_nav = driver.find_element(By.CSS_SELECTOR, "a[aria-current='page'], a[data-current='true'], [class*='active-href'], [class*='selected']")
        print(f"  - Active SideNav item text: '{active_nav.text}'")
        assert 'Operators' in active_nav.text, f"❌ Expected active SideNav 'Operators', got {active_nav.text}"
        print("  ✔ Confirmed: Direct access to /lci/operators works, SideNav highlight correct\n")

        # TEST 6: Direct URL access to /lci/operators/create
        print("▶ [Test 6] Testing direct URL access to /lci/operators/create...")
        driver.get('http://localhost:5173/lci/operators/create')
        time.sleep(1.5)
        print(f"  - Visited /lci/operators/create -> Current URL: {driver.current_url}")
        assert '/lci/operators/create' in driver.current_url, f"❌ Expected /lci/operators/create, got {driver.current_url}"
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Create Operator')]"))
        )
        # Check breadcrumbs
        breadcrumbs = driver.find_elements(By.CSS_SELECTOR, "[class*='breadcrumb'], nav[aria-label='Breadcrumbs'] li, ol li")
        breadcrumb_text = " > ".join([b.text for b in breadcrumbs if b.text.strip()])
        print(f"  - Breadcrumbs: {breadcrumb_text}")
        assert 'Create operator' in breadcrumb_text or 'Create Operator' in breadcrumb_text
        print("  ✔ Confirmed: Direct access to /lci/operators/create works with cascade selector\n")

        # TEST 7: Direct URL access to /lci/rbac-policies
        print("▶ [Test 7] Testing direct URL access to /lci/rbac-policies...")
        driver.get('http://localhost:5173/lci/rbac-policies')
        time.sleep(1.5)
        print(f"  - Visited /lci/rbac-policies -> Current URL: {driver.current_url}")
        assert '/lci/rbac-policies' in driver.current_url, f"❌ Expected /lci/rbac-policies, got {driver.current_url}"
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'RBAC Policy Simulator')]"))
        )
        print("  ✔ Confirmed: Direct access to /lci/rbac-policies works\n")

        # TEST 8: Direct URL access to /lci/sessions
        print("▶ [Test 8] Testing direct URL access to /lci/sessions...")
        driver.get('http://localhost:5173/lci/sessions')
        time.sleep(1.5)
        print(f"  - Visited /lci/sessions -> Current URL: {driver.current_url}")
        assert '/lci/sessions' in driver.current_url, f"❌ Expected /lci/sessions, got {driver.current_url}"
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Session Metrics') or contains(text(), 'Active Sessions')]"))
        )
        print("  ✔ Confirmed: Direct access to /lci/sessions works\n")

        # TEST 9: In-app SideNav navigation
        print("▶ [Test 9] Testing in-app navigation via SideNavigation...")
        # Click on Dashboard in SideNavigation
        dashboard_nav_link = driver.find_element(By.XPATH, "//a[contains(., 'Dashboard')]")
        dashboard_nav_link.click()
        time.sleep(1)
        print(f"  - Clicked 'Dashboard' in SideNav -> Current URL: {driver.current_url}")
        assert '/lci/dashboard' in driver.current_url, f"❌ Expected /lci/dashboard, got {driver.current_url}"

        # Click on Operators in SideNavigation
        operators_nav_link = driver.find_element(By.XPATH, "//a[contains(., 'Operators')]")
        operators_nav_link.click()
        time.sleep(1)
        print(f"  - Clicked 'Operators' in SideNav -> Current URL: {driver.current_url}")
        assert '/lci/operators' in driver.current_url, f"❌ Expected /lci/operators, got {driver.current_url}"
        print("  ✔ Confirmed: SideNavigation in-app routing works\n")

        # TEST 10: In-app Breadcrumb navigation
        print("▶ [Test 10] Testing in-app Breadcrumb navigation...")
        # Click LolaCore Identity breadcrumb
        lci_crumb = driver.find_element(By.XPATH, "//a[contains(., 'Lola Core Identity')]")
        lci_crumb.click()
        time.sleep(1)
        print(f"  - Clicked 'Lola Core Identity' breadcrumb -> Current URL: {driver.current_url}")
        assert '/lci/dashboard' in driver.current_url, f"❌ Expected /lci/dashboard, got {driver.current_url}"

        # Click LolaCloud Console breadcrumb
        home_crumb = driver.find_element(By.XPATH, "//a[contains(., 'LolaCloud Console')]")
        home_crumb.click()
        time.sleep(1)
        print(f"  - Clicked 'LolaCloud Console' breadcrumb -> Current URL: {driver.current_url}")
        assert driver.current_url.endswith('/'), f"❌ Expected '/', got {driver.current_url}"
        print("  ✔ Confirmed: Breadcrumb in-app routing works\n")

        # TEST 11: Top Navigation Logo & Autosuggest navigation
        print("▶ [Test 11] Testing TopNavigation logo and Autosuggest search routing...")
        # Navigate to /lci/dashboard first
        driver.get('http://localhost:5173/lci/dashboard')
        time.sleep(1)
        # Click Logo
        logo = driver.find_element(By.XPATH, "//a[contains(@class, 'logo') or contains(@aria-label, 'LolaCloud') or .//img[@alt='LolaCloud']]")
        driver.execute_script("arguments[0].click();", logo)
        time.sleep(1)
        print(f"  - Clicked TopNav logo -> Current URL: {driver.current_url}")
        assert driver.current_url.endswith('/'), f"❌ Expected '/', got {driver.current_url}"

        # Search Autosuggest for LCI
        search_inputs = [i for i in driver.find_elements(By.CSS_SELECTOR, "input[aria-label='Search LolaCloud services'], input[placeholder*='Search services']") if i.is_displayed()]
        search_input = search_inputs[0]
        search_input.click()
        search_input.send_keys("LCI")
        time.sleep(1)

        # Find option containing Lola Core Identity
        opts = [o for o in driver.find_elements(By.CSS_SELECTOR, '[role="option"]') if 'Lola Core Identity' in o.text]
        assert len(opts) > 0, "❌ No matching autosuggest option found for LCI"
        opts[0].click()
        time.sleep(1)

        print(f"  - Selected 'LCI' from autosuggest -> Current URL: {driver.current_url}")
        assert '/lci/dashboard' in driver.current_url, f"❌ Expected /lci/dashboard, got {driver.current_url}"
        print("  ✔ Confirmed: TopNav logo and autosuggest navigate correctly\n")

        # TEST 12: Browser Back and Forward
        print("▶ [Test 12] Testing Browser Back and Forward history navigation...")
        driver.get('http://localhost:5173/')
        time.sleep(0.5)
        driver.get('http://localhost:5173/lci/dashboard')
        time.sleep(0.5)
        driver.get('http://localhost:5173/lci/operators')
        time.sleep(0.5)
        print(f"  - Starting at: {driver.current_url}")

        driver.back()
        time.sleep(0.5)
        print(f"  - After driver.back() -> Current URL: {driver.current_url}")
        assert '/lci/dashboard' in driver.current_url

        driver.back()
        time.sleep(0.5)
        print(f"  - After driver.back() -> Current URL: {driver.current_url}")
        assert driver.current_url.endswith('/')

        driver.forward()
        time.sleep(0.5)
        print(f"  - After driver.forward() -> Current URL: {driver.current_url}")
        assert '/lci/dashboard' in driver.current_url

        driver.forward()
        time.sleep(0.5)
        print(f"  - After driver.forward() -> Current URL: {driver.current_url}")
        assert '/lci/operators' in driver.current_url
        print("  ✔ Confirmed: Browser back and forward history works seamlessly\n")

        # TEST 13: Direct URL refresh
        print("▶ [Test 13] Testing Direct URL refresh on deep link...")
        print(f"  - Before refresh -> Current URL: {driver.current_url}")
        assert '/lci/operators' in driver.current_url
        driver.execute_script("location.reload();")
        time.sleep(2)
        print(f"  - After refresh -> Current URL: {driver.current_url}")
        assert '/lci/operators' in driver.current_url
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Operators')] | //h2[contains(., 'Operators')]"))
        )
        print("  ✔ Confirmed: Direct URL refresh preserves route and state\n")

        # TEST 14: Sign Out routing
        print("▶ [Test 14] Testing Sign Out routing to /login...")
        user_buttons = [b for b in driver.find_elements(By.XPATH, '//button[contains(., "root")]') if b.is_displayed()]
        user_buttons[0].click()
        time.sleep(0.5)

        signout_items = [s for s in driver.find_elements(By.XPATH, '//*[contains(text(), "Sign Out")]') if s.is_displayed()]
        signout_items[0].click()
        time.sleep(1.5)
        print(f"  - After Sign Out -> Current URL: {driver.current_url}")
        assert '/login' in driver.current_url
        token_after = driver.execute_script("return localStorage.getItem('lola_token');")
        print(f"  - Token after logout: {token_after}")
        assert token_after is None, f"❌ Expected token to be cleared, got {token_after}"
        print("  ✔ Confirmed: Sign Out cleanly navigates to /login and clears tokens\n")

        print("=========================================================")
        print("🎉 ALL 14 ROUTER & NAVIGATION TESTS PASSED SUCCESSFULLY!")
        print("=========================================================")

    finally:
        driver.quit()

if __name__ == '__main__':
    run()
