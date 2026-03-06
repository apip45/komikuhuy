# K6 Test Runner Script for Windows PowerShell
# Simplified script to run various k6 performance tests

param(
    [string]$Type = "quick",
    [string]$Environment = "production",
    [string]$Url = "",
    [int]$Vus = 0,
    [string]$Duration = "",
    [string]$Output = "",
    [switch]$Help
)

# Function to print colored output
function Write-ColorOutput {
    param(
        [string]$Color,
        [string]$Message
    )
    
    $colors = @{
        "Red" = "Red"
        "Green" = "Green"
        "Yellow" = "Yellow"
        "Blue" = "Cyan"
    }
    
    Write-Host $Message -ForegroundColor $colors[$Color]
}

# Function to display help
function Show-Help {
    Write-Host @"
K6 Test Runner for AF-Komik V2

Usage: .\run-test.ps1 [OPTIONS]

OPTIONS:
    -Type TYPE              Test type: quick, full, stress, spike, soak
                            (default: quick)
    
    -Environment ENV        Environment: production, staging, local
                            (default: production)
    
    -Url URL               Base URL (overrides environment default)
    
    -Vus VUS               Number of virtual users (overrides test default)
    
    -Duration DUR          Test duration (overrides test default)
                            Examples: 30s, 5m, 1h
    
    -Output FILE           Save results to JSON file
    
    -Help                  Show this help message

EXAMPLES:
    # Run quick test on production
    .\run-test.ps1 -Type quick
    
    # Run stress test on staging
    .\run-test.ps1 -Type stress -Environment staging
    
    # Run custom load test
    .\run-test.ps1 -Type quick -Vus 100 -Duration 5m
    
    # Run test with custom URL
    .\run-test.ps1 -Type full -Url http://localhost:3000
    
    # Run test and save results
    .\run-test.ps1 -Type full -Output results/my-test.json

TEST TYPES:
    quick       Fast 2-minute validation test
    full        Complete 18-minute comprehensive test
    stress      Stress test to find breaking point
    spike       Sudden traffic spike simulation
    soak        4-hour endurance test

ENVIRONMENTS:
    production  https://comic.mikan.my.id
    staging     https://staging.comic.mikan.my.id
    local       http://localhost:3000

"@
}

# Show help if requested
if ($Help) {
    Show-Help
    exit 0
}

# Set environment-specific URLs
$BaseUrl = $Url
if ($BaseUrl -eq "") {
    switch ($Environment) {
        "production" { $BaseUrl = "https://comic.mikan.my.id" }
        "staging" { $BaseUrl = "https://staging.comic.mikan.my.id" }
        "local" { $BaseUrl = "http://localhost:3000" }
        default { $BaseUrl = "https://comic.mikan.my.id" }
    }
}

# Select test file based on type
$TestFile = ""
$TestName = ""

switch ($Type) {
    "quick" {
        $TestFile = "quick-test.js"
        $TestName = "Quick Performance Test"
    }
    "full" {
        $TestFile = "performance-test.js"
        $TestName = "Full Performance Test"
    }
    "stress" {
        $TestFile = "stress-test.js"
        $TestName = "Stress Test"
    }
    "spike" {
        $TestFile = "spike-test.js"
        $TestName = "Spike Test"
    }
    "soak" {
        $TestFile = "soak-test.js"
        $TestName = "Soak Test (Endurance)"
    }
    default {
        Write-ColorOutput "Red" "Invalid test type: $Type"
        Show-Help
        exit 1
    }
}

# Check if k6 is installed
$k6Installed = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Installed) {
    Write-ColorOutput "Red" "Error: k6 is not installed"
    Write-Host ""
    Write-Host "Install k6 on Windows:"
    Write-Host "  choco install k6"
    Write-Host ""
    Write-Host "Or download from: https://k6.io/docs/getting-started/installation/"
    exit 1
}

# Create results directory if it doesn't exist
if (-not (Test-Path "results")) {
    New-Item -ItemType Directory -Path "results" | Out-Null
}

# Print test information
Write-Host ""
Write-ColorOutput "Blue" "========================================"
Write-ColorOutput "Blue" "  AF-Komik V2 - K6 Performance Test"
Write-ColorOutput "Blue" "========================================"
Write-Host ""
Write-ColorOutput "Green" "Test Configuration:"
Write-Host "  Test Type:    $TestName"
Write-Host "  Environment:  $Environment"
Write-Host "  Base URL:     $BaseUrl"

if ($Vus -gt 0) {
    Write-Host "  Virtual Users: $Vus"
}

if ($Duration -ne "") {
    Write-Host "  Duration:     $Duration"
}

if ($Output -ne "") {
    Write-Host "  Output File:  $Output"
}

Write-Host ""

# Build k6 command
$k6Args = @("run")
$k6Args += "-e"
$k6Args += "BASE_URL=$BaseUrl"

if ($Vus -gt 0) {
    $k6Args += "--vus"
    $k6Args += $Vus
}

if ($Duration -ne "") {
    $k6Args += "--duration"
    $k6Args += $Duration
}

if ($Output -ne "") {
    $k6Args += "--out"
    $k6Args += "json=$Output"
}

$k6Args += $TestFile

# Confirm before running
Write-ColorOutput "Yellow" "Starting test in 3 seconds..."
Start-Sleep -Seconds 3

# Run the test
Write-ColorOutput "Green" "Running test..."
Write-Host ""

try {
    & k6 $k6Args
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-ColorOutput "Green" "✅ Test completed successfully!"
        
        if ($Output -ne "") {
            Write-ColorOutput "Green" "Results saved to: $Output"
        }
        
        # Check if HTML report was generated
        $htmlReport = "results\summary.html"
        if (Test-Path $htmlReport) {
            Write-ColorOutput "Green" "HTML report generated: $htmlReport"
            
            # Try to open HTML report
            Start-Process $htmlReport
        }
    } else {
        Write-Host ""
        Write-ColorOutput "Red" "❌ Test failed!"
        exit 1
    }
}
catch {
    Write-Host ""
    Write-ColorOutput "Red" "❌ Error running test: $_"
    exit 1
}

Write-Host ""
Write-ColorOutput "Blue" "========================================"
Write-Host ""
