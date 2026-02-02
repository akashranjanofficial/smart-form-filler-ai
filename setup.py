#!/usr/bin/env python3
"""
🚀 Smart Form Filler AI - Automated Setup Script
================================================

This script automatically configures everything you need to run
Smart Form Filler AI extension with local Ollama support.

Usage:
    python3 setup.py           # Full setup
    python3 setup.py --check   # Check system requirements only
    python3 setup.py --ollama  # Setup Ollama only
    python3 setup.py --dev     # Setup development environment only

Requirements:
    - Python 3.8+
    - macOS, Linux, or Windows
    - Internet connection for downloading dependencies
"""

import os
import sys
import subprocess
import platform
import shutil
import json
import time
import argparse
from pathlib import Path
from typing import Optional, Tuple, List
import urllib.request
import urllib.error

# ============================================================================
# Configuration
# ============================================================================

OLLAMA_MODELS = ["llama3.2:3b", "llama3.2:1b"]  # Models to pull
DEFAULT_MODEL = "llama3.2:3b"
AI_BRAIN_PORT = 3001
EXTENSION_DIR = Path(__file__).parent.resolve()

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

def colored(text: str, color: str) -> str:
    """Return colored text for terminal."""
    if platform.system() == "Windows":
        return text  # Windows cmd doesn't support ANSI by default
    return f"{color}{text}{Colors.END}"

def print_banner():
    """Print the setup script banner."""
    banner = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🚀 Smart Form Filler AI - Automated Setup                              ║
║   ─────────────────────────────────────────                              ║
║   AI-powered form filling with local Ollama support                      ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
    """
    print(colored(banner, Colors.CYAN))

def print_step(step: int, total: int, message: str):
    """Print a step message."""
    print(f"\n{colored(f'[{step}/{total}]', Colors.BLUE)} {colored(message, Colors.BOLD)}")

def print_success(message: str):
    """Print a success message."""
    print(f"  {colored('✓', Colors.GREEN)} {message}")

def print_warning(message: str):
    """Print a warning message."""
    print(f"  {colored('⚠', Colors.YELLOW)} {message}")

def print_error(message: str):
    """Print an error message."""
    print(f"  {colored('✗', Colors.RED)} {message}")

def print_info(message: str):
    """Print an info message."""
    print(f"  {colored('ℹ', Colors.CYAN)} {message}")

# ============================================================================
# System Detection
# ============================================================================

def get_system_info() -> dict:
    """Get system information."""
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "home_dir": Path.home(),
    }

def run_command(cmd: List[str], capture: bool = True, check: bool = False) -> Tuple[int, str, str]:
    """Run a command and return (returncode, stdout, stderr)."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=capture,
            text=True,
            check=check
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except FileNotFoundError:
        return 1, "", f"Command not found: {cmd[0]}"
    except subprocess.CalledProcessError as e:
        return e.returncode, e.stdout or "", e.stderr or ""

def check_command_exists(cmd: str) -> bool:
    """Check if a command exists in PATH."""
    return shutil.which(cmd) is not None

def get_command_version(cmd: str, version_flag: str = "--version") -> Optional[str]:
    """Get the version of a command."""
    code, stdout, stderr = run_command([cmd, version_flag])
    if code == 0:
        return stdout.split('\n')[0]
    return None

# ============================================================================
# Dependency Checks
# ============================================================================

def check_node() -> Tuple[bool, Optional[str]]:
    """Check if Node.js is installed."""
    if check_command_exists("node"):
        version = get_command_version("node", "-v")
        return True, version
    return False, None

def check_npm() -> Tuple[bool, Optional[str]]:
    """Check if npm is installed."""
    if check_command_exists("npm"):
        version = get_command_version("npm", "-v")
        return True, version
    return False, None

def check_ollama() -> Tuple[bool, Optional[str]]:
    """Check if Ollama is installed."""
    if check_command_exists("ollama"):
        version = get_command_version("ollama", "--version")
        return True, version
    return False, None

def check_ollama_running() -> bool:
    """Check if Ollama server is running."""
    try:
        urllib.request.urlopen("http://localhost:11434/api/tags", timeout=2)
        return True
    except (urllib.error.URLError, urllib.error.HTTPError):
        return False

def check_git() -> Tuple[bool, Optional[str]]:
    """Check if git is installed."""
    if check_command_exists("git"):
        version = get_command_version("git", "--version")
        return True, version
    return False, None

def check_chrome() -> Tuple[bool, str]:
    """Check if Chrome or Chromium-based browser is installed."""
    system = platform.system()
    
    browsers = {
        "Darwin": [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ],
        "Linux": [
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/usr/bin/brave-browser",
        ],
        "Windows": [
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        ]
    }
    
    for browser_path in browsers.get(system, []):
        if os.path.exists(browser_path):
            return True, browser_path
    
    return False, ""

# ============================================================================
# Installation Functions
# ============================================================================

def install_node_macos():
    """Install Node.js on macOS using Homebrew."""
    print_info("Installing Node.js via Homebrew...")
    
    # Check if Homebrew is installed
    if not check_command_exists("brew"):
        print_info("Installing Homebrew first...")
        code, _, _ = run_command([
            "/bin/bash", "-c",
            "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        ])
        if code != 0:
            print_error("Failed to install Homebrew")
            return False
    
    code, _, stderr = run_command(["brew", "install", "node"])
    if code != 0:
        print_error(f"Failed to install Node.js: {stderr}")
        return False
    
    print_success("Node.js installed successfully")
    return True

def install_node_linux():
    """Install Node.js on Linux using NodeSource."""
    print_info("Installing Node.js via NodeSource...")
    
    # Use NodeSource setup script for latest LTS
    commands = [
        ["curl", "-fsSL", "https://deb.nodesource.com/setup_lts.x", "-o", "/tmp/nodesource_setup.sh"],
        ["sudo", "bash", "/tmp/nodesource_setup.sh"],
        ["sudo", "apt-get", "install", "-y", "nodejs"],
    ]
    
    for cmd in commands:
        code, _, stderr = run_command(cmd)
        if code != 0:
            print_error(f"Failed to run: {' '.join(cmd)}")
            return False
    
    print_success("Node.js installed successfully")
    return True

def install_node():
    """Install Node.js based on the operating system."""
    system = platform.system()
    
    if system == "Darwin":
        return install_node_macos()
    elif system == "Linux":
        return install_node_linux()
    elif system == "Windows":
        print_info("Please download Node.js from: https://nodejs.org/")
        print_info("After installation, restart this script.")
        return False
    
    print_error(f"Unsupported operating system: {system}")
    return False

def install_ollama_macos():
    """Install Ollama on macOS."""
    print_info("Installing Ollama via Homebrew...")
    
    code, _, stderr = run_command(["brew", "install", "ollama"])
    if code != 0:
        print_error(f"Failed to install Ollama: {stderr}")
        print_info("Trying alternative installation method...")
        code, _, _ = run_command([
            "curl", "-fsSL", "https://ollama.com/install.sh", "-o", "/tmp/ollama_install.sh"
        ])
        code, _, _ = run_command(["bash", "/tmp/ollama_install.sh"])
        if code != 0:
            return False
    
    print_success("Ollama installed successfully")
    return True

def install_ollama_linux():
    """Install Ollama on Linux."""
    print_info("Installing Ollama...")
    
    code, _, stderr = run_command([
        "curl", "-fsSL", "https://ollama.com/install.sh"
    ])
    
    # Pipe to bash
    install_script = subprocess.run(
        ["curl", "-fsSL", "https://ollama.com/install.sh"],
        capture_output=True,
        text=True
    )
    
    if install_script.returncode == 0:
        result = subprocess.run(
            ["bash"],
            input=install_script.stdout,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print_success("Ollama installed successfully")
            return True
    
    print_error("Failed to install Ollama")
    return False

def install_ollama():
    """Install Ollama based on the operating system."""
    system = platform.system()
    
    if system == "Darwin":
        return install_ollama_macos()
    elif system == "Linux":
        return install_ollama_linux()
    elif system == "Windows":
        print_info("Please download Ollama from: https://ollama.com/download")
        print_info("After installation, restart this script.")
        return False
    
    print_error(f"Unsupported operating system: {system}")
    return False

def start_ollama():
    """Start Ollama server."""
    if check_ollama_running():
        print_success("Ollama is already running")
        return True
    
    print_info("Starting Ollama server...")
    system = platform.system()
    
    if system == "Darwin":
        # On macOS, start Ollama app or serve command
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
    elif system == "Linux":
        # On Linux, use systemctl or direct command
        code, _, _ = run_command(["systemctl", "--user", "start", "ollama"])
        if code != 0:
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
    
    # Wait for server to start
    for i in range(10):
        time.sleep(1)
        if check_ollama_running():
            print_success("Ollama server started")
            return True
        print_info(f"Waiting for Ollama to start... ({i+1}/10)")
    
    print_error("Failed to start Ollama server")
    return False

def pull_ollama_model(model: str) -> bool:
    """Pull an Ollama model."""
    print_info(f"Pulling model: {model} (this may take a few minutes)...")
    
    # Run with output visible
    process = subprocess.Popen(
        ["ollama", "pull", model],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    for line in process.stdout:
        # Show progress
        if "pulling" in line.lower() or "%" in line:
            print(f"    {line.strip()}", end='\r')
    
    process.wait()
    print()  # New line after progress
    
    if process.returncode == 0:
        print_success(f"Model {model} pulled successfully")
        return True
    
    print_error(f"Failed to pull model {model}")
    return False

def check_ollama_model(model: str) -> bool:
    """Check if an Ollama model is installed."""
    code, stdout, _ = run_command(["ollama", "list"])
    if code == 0:
        return model.split(":")[0] in stdout
    return False

# ============================================================================
# Project Setup Functions
# ============================================================================

def install_npm_dependencies():
    """Install npm dependencies for the main extension."""
    print_info("Installing extension dependencies...")
    
    os.chdir(EXTENSION_DIR)
    code, stdout, stderr = run_command(["npm", "install"])
    
    if code != 0:
        print_error(f"Failed to install dependencies: {stderr}")
        return False
    
    print_success("Extension dependencies installed")
    return True

def install_ai_brain_dependencies():
    """Install npm dependencies for the AI Brain server."""
    ai_brain_dir = EXTENSION_DIR / "ai-brain-server"
    
    if not ai_brain_dir.exists():
        print_warning("AI Brain server directory not found, skipping...")
        return True
    
    print_info("Installing AI Brain server dependencies...")
    
    os.chdir(ai_brain_dir)
    code, stdout, stderr = run_command(["npm", "install"])
    
    if code != 0:
        print_error(f"Failed to install AI Brain dependencies: {stderr}")
        return False
    
    print_success("AI Brain server dependencies installed")
    os.chdir(EXTENSION_DIR)
    return True

def build_ai_brain_server():
    """Build the AI Brain TypeScript server."""
    ai_brain_dir = EXTENSION_DIR / "ai-brain-server"
    
    if not ai_brain_dir.exists():
        return True
    
    print_info("Building AI Brain server...")
    
    os.chdir(ai_brain_dir)
    code, stdout, stderr = run_command(["npm", "run", "build"])
    
    if code != 0:
        print_warning(f"Build step skipped (may not be configured): {stderr}")
    else:
        print_success("AI Brain server built successfully")
    
    os.chdir(EXTENSION_DIR)
    return True

def create_default_profile():
    """Create a default profile.json if it doesn't exist."""
    profile_path = EXTENSION_DIR / "profile.json"
    
    if profile_path.exists():
        print_info("Profile already exists, skipping...")
        return True
    
    print_info("Creating default profile template...")
    
    default_profile = {
        "personal": {
            "firstName": "",
            "lastName": "",
            "email": "",
            "phone": "",
            "location": "",
            "linkedin": "",
            "github": "",
            "portfolio": ""
        },
        "professional": {
            "title": "",
            "summary": "",
            "yearsOfExperience": "",
            "skills": [],
            "currentCompany": "",
            "education": ""
        },
        "preferences": {
            "jobTypes": ["Full-time"],
            "remotePreference": "Remote",
            "salaryExpectation": "",
            "willingToRelocate": False
        },
        "documents": {
            "resumePath": "",
            "coverLetterPath": ""
        }
    }
    
    with open(profile_path, 'w') as f:
        json.dump(default_profile, f, indent=2)
    
    print_success("Default profile created at profile.json")
    print_info("Please edit profile.json with your information")
    return True

def create_env_file():
    """Create .env file with default configuration."""
    env_path = EXTENSION_DIR / ".env"
    
    if env_path.exists():
        print_info(".env file already exists, skipping...")
        return True
    
    print_info("Creating .env configuration file...")
    
    env_content = """# Smart Form Filler AI Configuration
# ==================================

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# AI Brain Server (optional RAG memory)
AI_BRAIN_ENABLED=true
AI_BRAIN_URL=http://localhost:3001

# Gemini API (optional cloud AI)
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=

# Extension Settings
DEBUG_MODE=false
LOG_LEVEL=info
"""
    
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    print_success(".env file created")
    return True

def run_tests():
    """Run the test suite."""
    print_info("Running tests to verify setup...")
    
    os.chdir(EXTENSION_DIR)
    code, stdout, stderr = run_command(["npm", "test"])
    
    if code != 0:
        print_warning("Some tests may have failed (this is OK for initial setup)")
    else:
        print_success("All tests passed!")
    
    return True

# ============================================================================
# Main Setup Flow
# ============================================================================

def check_requirements() -> dict:
    """Check all system requirements."""
    print_step(1, 6, "Checking System Requirements")
    
    results = {
        "node": check_node(),
        "npm": check_npm(),
        "git": check_git(),
        "ollama": check_ollama(),
        "chrome": check_chrome(),
        "ollama_running": check_ollama_running(),
    }
    
    # Print results
    node_ok, node_ver = results["node"]
    npm_ok, npm_ver = results["npm"]
    git_ok, git_ver = results["git"]
    ollama_ok, ollama_ver = results["ollama"]
    chrome_ok, chrome_path = results["chrome"]
    
    if node_ok:
        print_success(f"Node.js: {node_ver}")
    else:
        print_error("Node.js: Not installed")
    
    if npm_ok:
        print_success(f"npm: {npm_ver}")
    else:
        print_error("npm: Not installed")
    
    if git_ok:
        print_success(f"Git: {git_ver}")
    else:
        print_warning("Git: Not installed (optional)")
    
    if ollama_ok:
        print_success(f"Ollama: {ollama_ver}")
    else:
        print_error("Ollama: Not installed")
    
    if chrome_ok:
        print_success(f"Browser: Found at {chrome_path}")
    else:
        print_error("Chrome/Chromium: Not found")
    
    if results["ollama_running"]:
        print_success("Ollama server: Running")
    else:
        print_warning("Ollama server: Not running")
    
    return results

def setup_dependencies(requirements: dict):
    """Install missing dependencies."""
    print_step(2, 6, "Installing Missing Dependencies")
    
    node_ok, _ = requirements["node"]
    ollama_ok, _ = requirements["ollama"]
    
    if not node_ok:
        print_info("Node.js is required. Attempting to install...")
        if not install_node():
            print_error("Failed to install Node.js. Please install manually:")
            print_info("  https://nodejs.org/")
            sys.exit(1)
    else:
        print_success("Node.js already installed")
    
    if not ollama_ok:
        print_info("Ollama is required for local AI. Attempting to install...")
        if not install_ollama():
            print_error("Failed to install Ollama. Please install manually:")
            print_info("  https://ollama.com/download")
            sys.exit(1)
    else:
        print_success("Ollama already installed")

def setup_ollama(requirements: dict):
    """Setup Ollama server and models."""
    print_step(3, 6, "Setting Up Ollama")
    
    # Start Ollama if not running
    if not requirements["ollama_running"]:
        if not start_ollama():
            print_error("Could not start Ollama server")
            print_info("Please start Ollama manually and re-run this script")
            sys.exit(1)
    
    # Pull required models
    for model in OLLAMA_MODELS:
        if check_ollama_model(model):
            print_success(f"Model {model} already available")
        else:
            if not pull_ollama_model(model):
                print_warning(f"Failed to pull {model}, continuing...")

def setup_project():
    """Setup the project dependencies and configuration."""
    print_step(4, 6, "Setting Up Project")
    
    install_npm_dependencies()
    install_ai_brain_dependencies()
    build_ai_brain_server()

def setup_configuration():
    """Create configuration files."""
    print_step(5, 6, "Creating Configuration Files")
    
    create_default_profile()
    create_env_file()

def print_completion():
    """Print completion message with next steps."""
    print_step(6, 6, "Setup Complete!")
    
    completion_message = f"""
{colored('═' * 70, Colors.GREEN)}

  {colored('🎉 Smart Form Filler AI is ready!', Colors.GREEN + Colors.BOLD)}

{colored('═' * 70, Colors.GREEN)}

  {colored('Next Steps:', Colors.BOLD)}

  1. {colored('Edit your profile:', Colors.CYAN)}
     Open profile.json and add your information

  2. {colored('Load the extension in Chrome:', Colors.CYAN)}
     • Open Chrome and go to: chrome://extensions
     • Enable "Developer mode" (toggle in top right)
     • Click "Load unpacked"
     • Select this folder: {EXTENSION_DIR}

  3. {colored('Start the AI Brain server (optional):', Colors.CYAN)}
     cd ai-brain-server && npm start

  4. {colored('Test the extension:', Colors.CYAN)}
     • Click the extension icon in Chrome
     • Go to any job application form
     • Click "Fill Form" to auto-fill!

{colored('─' * 70, Colors.CYAN)}

  {colored('Useful Commands:', Colors.BOLD)}

  • Run tests:        npm test
  • Start AI Brain:   cd ai-brain-server && npm start
  • Pull more models: ollama pull <model-name>
  • Check Ollama:     ollama list

{colored('─' * 70, Colors.CYAN)}

  {colored('Configuration:', Colors.BOLD)}

  • Ollama URL:    http://localhost:11434
  • AI Brain URL:  http://localhost:3001
  • Default Model: {DEFAULT_MODEL}

{colored('═' * 70, Colors.GREEN)}

  {colored('Happy form filling! 🚀', Colors.CYAN + Colors.BOLD)}

"""
    print(completion_message)

def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(
        description="Smart Form Filler AI - Automated Setup Script"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only check system requirements"
    )
    parser.add_argument(
        "--ollama",
        action="store_true",
        help="Only setup Ollama"
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Only setup development environment"
    )
    parser.add_argument(
        "--skip-models",
        action="store_true",
        help="Skip downloading Ollama models"
    )
    
    args = parser.parse_args()
    
    print_banner()
    
    # Get system info
    sys_info = get_system_info()
    print(f"  System: {sys_info['os']} {sys_info['architecture']}")
    print(f"  Python: {sys_info['python_version']}")
    print(f"  Directory: {EXTENSION_DIR}")
    
    # Check requirements
    requirements = check_requirements()
    
    if args.check:
        # Just check and exit
        all_ok = all([
            requirements["node"][0],
            requirements["npm"][0],
            requirements["ollama"][0],
            requirements["chrome"][0],
        ])
        sys.exit(0 if all_ok else 1)
    
    if args.ollama:
        # Only setup Ollama
        setup_dependencies(requirements)
        setup_ollama(requirements)
        print_success("Ollama setup complete!")
        sys.exit(0)
    
    if args.dev:
        # Only setup development environment
        setup_project()
        setup_configuration()
        print_success("Development environment setup complete!")
        sys.exit(0)
    
    # Full setup
    setup_dependencies(requirements)
    
    if not args.skip_models:
        # Re-check ollama after potential installation
        requirements["ollama"] = check_ollama()
        requirements["ollama_running"] = check_ollama_running()
        setup_ollama(requirements)
    else:
        print_info("Skipping Ollama model downloads (--skip-models)")
    
    setup_project()
    setup_configuration()
    print_completion()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  Setup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print_error(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
