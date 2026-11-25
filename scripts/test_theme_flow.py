import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def run():
    print("=========================================================")
    print("🚀 LolaCloud Console Theme Engine Verification & Capture")
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
        # STEP 1: Verify Default Mode (Dark Mode)
        print("▶ [Step 1] Loading application with empty localStorage...")
        driver.get('http://localhost:5173')
        driver.execute_script("localStorage.clear(); location.reload();")
        time.sleep(2)

        body_classes = driver.execute_script("return document.body.className;")
        stored_theme = driver.execute_script("return localStorage.getItem('lola_theme');")
        print(f"  - Body classes on startup: '{body_classes}'")
        print(f"  - Stored 'lola_theme' on startup: {stored_theme}")
        assert 'awsui-dark-mode' in body_classes, "❌ FAILED: Dark Mode must be default ('awsui-dark-mode' on body)!"
        print("  ✔ Confirmed: Default theme is Dark Mode ('awsui-dark-mode' applied).\n")

        # STEP 2: Authenticate Operator
        print("▶ [Step 2] Authenticating as operator 'root'...")
        driver.execute_script("""
          localStorage.setItem('lola_token', 'session-test-token-jwt');
          localStorage.setItem('lola_operator', JSON.stringify({
            username: 'root',
            role: 'ROOT_ADMIN',
            permissions: ['*::*::*']
          }));
          location.reload();
        """)
        time.sleep(2)

        # Confirm TopNavigation loaded
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "lola-top-navigation-header"))
        )
        print("  ✔ Logged in. Console header and dashboard visible.\n")

        # STEP 3: Capture Dark Mode Screenshot
        print("▶ [Step 3] Capturing Dark Mode screenshot...")
        dark_screenshot_path = "/home/miranda/Documents/github/Lola/console/dark_mode_screenshot.png"
        driver.save_screenshot(dark_screenshot_path)
        print(f"  ✔ Dark mode screenshot saved: {dark_screenshot_path}\n")

        # STEP 4: Inspect User Menu Dropdown in Dark Mode
        print("▶ [Step 4] Opening user menu dropdown...")
        user_buttons = [b for b in driver.find_elements(By.TAG_NAME, 'button') if b.is_displayed() and b.text.strip() == 'root']
        assert len(user_buttons) > 0, "❌ User dropdown trigger button not found!"
        user_buttons[0].click()
        time.sleep(1)

        toggle_item = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[@data-testid='theme-toggle']"))
        )
        toggle_text = toggle_item.text.strip()
        print(f"  - Theme toggle menu text: '{toggle_text}'")
        assert 'Switch to Light Mode' in toggle_text, f"❌ Expected 'Switch to Light Mode', got '{toggle_text}'"

        divider_item = driver.find_element(By.XPATH, "//*[@data-testid='divider-theme']")
        assert divider_item is not None, "❌ Expected divider-theme item to exist in dropdown"
        print("  ✔ Found 'theme-toggle' with 'Switch to Light Mode' and 'divider-theme'.\n")

        # STEP 5: Toggle to Light Mode
        print("▶ [Step 5] Clicking 'Switch to Light Mode'...")
        toggle_item.click()
        time.sleep(1)

        body_classes_light = driver.execute_script("return document.body.className;")
        theme_light = driver.execute_script("return localStorage.getItem('lola_theme');")
        print(f"  - Body classes after toggle: '{body_classes_light}'")
        print(f"  - Stored 'lola_theme': '{theme_light}'")
        assert 'awsui-dark-mode' not in body_classes_light, "❌ FAILED: 'awsui-dark-mode' still present in light mode!"
        assert theme_light == 'light', f"❌ Expected lola_theme == 'light', got '{theme_light}'"
        print("  ✔ Confirmed: Mode switched to Light Mode ('awsui-dark-mode' removed, lola_theme = 'light').\n")

        # STEP 6: Capture Light Mode Screenshot
        print("▶ [Step 6] Capturing Light Mode screenshot...")
        light_screenshot_path = "/home/miranda/Documents/github/Lola/console/light_mode_screenshot.png"
        driver.save_screenshot(light_screenshot_path)
        print(f"  ✔ Light mode screenshot saved: {light_screenshot_path}\n")

        # STEP 7: Verify Dynamic Menu Item Text in Light Mode
        print("▶ [Step 7] Checking dropdown menu item in Light Mode...")
        user_buttons = [b for b in driver.find_elements(By.TAG_NAME, 'button') if b.is_displayed() and b.text.strip() == 'root']
        user_buttons[0].click()
        time.sleep(1)

        toggle_item_dark = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[@data-testid='theme-toggle']"))
        )
        toggle_text_dark = toggle_item_dark.text.strip()
        print(f"  - Theme toggle menu text now: '{toggle_text_dark}'")
        assert 'Switch to Dark Mode' in toggle_text_dark, f"❌ Expected 'Switch to Dark Mode', got '{toggle_text_dark}'"
        print("  ✔ Menu item text dynamically updated to 'Switch to Dark Mode'.\n")

        # STEP 8: Verify Persistence Across Page Reload
        print("▶ [Step 8] Verifying persistence on page reload...")
        driver.refresh()
        time.sleep(2)

        body_classes_persisted = driver.execute_script("return document.body.className;")
        theme_persisted = driver.execute_script("return localStorage.getItem('lola_theme');")
        print(f"  - Reloaded body classes: '{body_classes_persisted}'")
        print(f"  - Reloaded 'lola_theme': '{theme_persisted}'")
        assert 'awsui-dark-mode' not in body_classes_persisted, "❌ FAILED: Reload reverted to dark mode!"
        assert theme_persisted == 'light', f"❌ Expected 'light', got '{theme_persisted}'"
        print("  ✔ Confirmed: Light mode persisted cleanly across reload.\n")

        # STEP 9: Toggle back to Dark Mode
        print("▶ [Step 9] Toggling back to Dark Mode...")
        user_buttons = [b for b in driver.find_elements(By.TAG_NAME, 'button') if b.is_displayed() and b.text.strip() == 'root']
        user_buttons[0].click()
        time.sleep(1)

        toggle_item_back = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[@data-testid='theme-toggle']"))
        )
        toggle_item_back.click()
        time.sleep(1)

        body_classes_dark_again = driver.execute_script("return document.body.className;")
        theme_dark_again = driver.execute_script("return localStorage.getItem('lola_theme');")
        assert 'awsui-dark-mode' in body_classes_dark_again, "❌ FAILED: Did not switch back to dark mode!"
        assert theme_dark_again == 'dark', f"❌ Expected 'dark', got '{theme_dark_again}'"
        print(f"  - Stored theme: '{theme_dark_again}'")
        print("  ✔ Successfully switched back to Dark Mode.\n")

        print("=========================================================")
        print("🎉 ALL THEME CONFIGURATION AND PERSISTENCE TESTS PASSED!")
        print("=========================================================")

    finally:
        driver.quit()

if __name__ == '__main__':
    run()
