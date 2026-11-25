import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def capture():
    print("=========================================================")
    print("🛫 Lola Runway Screenshots & Verification")
    print("=========================================================\n")

    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1500,950')
    options.binary_location = '/usr/bin/chromium'

    service = Service(executable_path='/usr/bin/chromedriver')
    driver = webdriver.Chrome(service=service, options=options)

    output_dir = '/home/miranda/Documents/github/Lola/console'

    try:
        # STEP 1: Set up auth & Dark Mode
        print("▶ Setting up authentication and dark mode...")
        driver.get('http://localhost:5173')
        driver.execute_script("""
            localStorage.setItem('lola_theme', 'dark');
            localStorage.setItem('lola_token', 'runway-verification-token');
            localStorage.setItem('lola_operator', JSON.stringify({
                id: 'op-root-admin',
                username: 'root',
                role: 'Super Administrator',
                permissions: ['*::*::*']
            }));
            location.reload();
        """)
        time.sleep(2)

        # STEP 2: Capture Home Dashboard with Runway Card
        print("▶ [1/6] Capturing Home Dashboard with Runway...")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Lola Runway (Edge & Networking)')]"))
        )
        home_path = os.path.join(output_dir, 'runway_01_home_dashboard.png')
        driver.save_screenshot(home_path)
        print(f"  ✔ Captured: {home_path}")

        # STEP 3: Navigate to Runway Dashboard
        print("▶ [2/6] Capturing Runway Dashboard...")
        driver.get('http://localhost:5173/runway/dashboard')
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Runway Overview & Telemetry')]"))
        )
        time.sleep(1.5)
        dash_path = os.path.join(output_dir, 'runway_02_dashboard.png')
        driver.save_screenshot(dash_path)
        print(f"  ✔ Captured: {dash_path}")

        # STEP 4: Navigate to Runway Tunnels
        print("▶ [3/6] Capturing Runway Tunnels...")
        driver.get('http://localhost:5173/runway/tunnels')
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Zero Trust Tunnels')]"))
        )
        time.sleep(1.5)
        tunnels_path = os.path.join(output_dir, 'runway_03_tunnels.png')
        driver.save_screenshot(tunnels_path)
        print(f"  ✔ Captured: {tunnels_path}")

        # Open Create Tunnel Modal
        print("  - Opening Create Tunnel modal...")
        create_btn = driver.find_element(By.XPATH, "//button[contains(., 'Create Tunnel')]")
        create_btn.click()
        time.sleep(1)
        tun_modal_path = os.path.join(output_dir, 'runway_04_tunnel_modal.png')
        driver.save_screenshot(tun_modal_path)
        print(f"  ✔ Captured: {tun_modal_path}")

        # Close Modal
        cancel_btn = driver.find_element(By.XPATH, "//button[contains(., 'Cancel')]")
        cancel_btn.click()
        time.sleep(1)

        # STEP 5: Navigate to Runway Accounts
        print("▶ [4/6] Capturing Runway Accounts...")
        driver.get('http://localhost:5173/runway/accounts')
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Cloudflare Accounts')]"))
        )
        time.sleep(1.5)
        accounts_path = os.path.join(output_dir, 'runway_05_accounts.png')
        driver.save_screenshot(accounts_path)
        print(f"  ✔ Captured: {accounts_path}")

        # Open Connect Account Modal & Validate
        print("  - Opening Connect Account modal & validating credentials...")
        connect_btn = driver.find_element(By.XPATH, "//button[contains(., 'Connect Cloudflare Account')]")
        connect_btn.click()
        time.sleep(1)

        inputs = driver.find_elements(By.CSS_SELECTOR, "input")
        # Friendly Name, Email, Global API Key
        for inp in inputs:
            placeholder = inp.get_attribute("placeholder") or ""
            if "Production" in placeholder or "Friendly" in placeholder:
                inp.send_keys("Staging Cloudflare Account")
            elif "admin@" in placeholder:
                inp.send_keys("devops@lolacloud.internal")
            elif "Global API Key" in placeholder:
                inp.send_keys("3a9f8b2c1d4e5f60718293a4b5c6d7e8")

        time.sleep(0.5)
        validate_btn = driver.find_element(By.XPATH, "//button[contains(., 'Validate Credentials')]")
        validate_btn.click()
        time.sleep(2)

        acc_modal_path = os.path.join(output_dir, 'runway_06_account_modal.png')
        driver.save_screenshot(acc_modal_path)
        print(f"  ✔ Captured: {acc_modal_path}")

        cancel_acc_btn = driver.find_element(By.XPATH, "//button[contains(., 'Cancel')]")
        cancel_acc_btn.click()
        time.sleep(1)

        # STEP 6: Navigate to Runway DNS
        print("▶ [5/6] Capturing Runway DNS & Auto-IP Fix...")
        driver.get('http://localhost:5173/runway/dns')
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Edge Dynamic IP & Auto-Fix Daemon')]"))
        )
        time.sleep(1.5)
        dns_path = os.path.join(output_dir, 'runway_07_dns.png')
        driver.save_screenshot(dns_path)
        print(f"  ✔ Captured: {dns_path}")

        # Trigger Auto-IP Fix
        print("  - Triggering Auto-IP Fix Now...")
        fix_btn = driver.find_element(By.XPATH, "//button[contains(., 'Run Auto-IP Fix Now')]")
        fix_btn.click()
        time.sleep(2)
        dns_fix_path = os.path.join(output_dir, 'runway_08_dns_autofix.png')
        driver.save_screenshot(dns_fix_path)
        print(f"  ✔ Captured: {dns_fix_path}")

        print("\n🎉 All Runway screenshots captured successfully!")

    finally:
        driver.quit()

if __name__ == '__main__':
    capture()
