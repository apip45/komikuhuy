#!/bin/bash

###############################################################################
# K6 Test Runner Script
# Simplified script to run various k6 performance tests
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="quick"
ENVIRONMENT="production"
BASE_URL="https://comic.mikan.my.id"

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Function to display help
show_help() {
    cat << EOF
K6 Test Runner for AF-Komik V2

Usage: ./run-test.sh [OPTIONS]

OPTIONS:
    -t, --type TYPE         Test type: quick, full, stress, spike, soak
                            (default: quick)
    
    -e, --env ENV          Environment: production, staging, local
                            (default: production)
    
    -u, --url URL          Base URL (overrides environment default)
    
    -v, --vus VUS          Number of virtual users (overrides test default)
    
    -d, --duration DUR     Test duration (overrides test default)
                            Examples: 30s, 5m, 1h
    
    -o, --output FILE      Save results to JSON file
    
    -h, --help             Show this help message

EXAMPLES:
    # Run quick test on production
    ./run-test.sh -t quick
    
    # Run stress test on staging
    ./run-test.sh -t stress -e staging
    
    # Run custom load test
    ./run-test.sh -t quick -v 100 -d 5m
    
    # Run test with custom URL
    ./run-test.sh -t full -u http://localhost:3000
    
    # Run test and save results
    ./run-test.sh -t full -o results/my-test.json

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

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -v|--vus)
            VUS="$2"
            shift 2
            ;;
        -d|--duration)
            DURATION="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_color $RED "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set environment-specific URLs
case $ENVIRONMENT in
    production)
        BASE_URL="https://comic.mikan.my.id"
        ;;
    staging)
        BASE_URL="https://staging.comic.mikan.my.id"
        ;;
    local)
        BASE_URL="http://localhost:3000"
        ;;
esac

# Select test file based on type
case $TEST_TYPE in
    quick)
        TEST_FILE="quick-test.js"
        TEST_NAME="Quick Performance Test"
        ;;
    full)
        TEST_FILE="performance-test.js"
        TEST_NAME="Full Performance Test"
        ;;
    stress)
        TEST_FILE="stress-test.js"
        TEST_NAME="Stress Test"
        ;;
    spike)
        TEST_FILE="spike-test.js"
        TEST_NAME="Spike Test"
        ;;
    soak)
        TEST_FILE="soak-test.js"
        TEST_NAME="Soak Test (Endurance)"
        ;;
    *)
        print_color $RED "Invalid test type: $TEST_TYPE"
        show_help
        exit 1
        ;;
esac

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    print_color $RED "Error: k6 is not installed"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Windows: choco install k6"
    echo "  Linux:   See https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Create results directory if it doesn't exist
mkdir -p results

# Print test information
echo ""
print_color $BLUE "========================================"
print_color $BLUE "  AF-Komik V2 - K6 Performance Test"
print_color $BLUE "========================================"
echo ""
print_color $GREEN "Test Configuration:"
echo "  Test Type:    $TEST_NAME"
echo "  Environment:  $ENVIRONMENT"
echo "  Base URL:     $BASE_URL"
[ -n "$VUS" ] && echo "  Virtual Users: $VUS"
[ -n "$DURATION" ] && echo "  Duration:     $DURATION"
[ -n "$OUTPUT_FILE" ] && echo "  Output File:  $OUTPUT_FILE"
echo ""

# Build k6 command
K6_CMD="k6 run"
K6_CMD="$K6_CMD -e BASE_URL=$BASE_URL"
[ -n "$VUS" ] && K6_CMD="$K6_CMD --vus $VUS"
[ -n "$DURATION" ] && K6_CMD="$K6_CMD --duration $DURATION"
[ -n "$OUTPUT_FILE" ] && K6_CMD="$K6_CMD --out json=$OUTPUT_FILE"
K6_CMD="$K6_CMD $TEST_FILE"

# Confirm before running
print_color $YELLOW "Starting test in 3 seconds..."
sleep 3

# Run the test
print_color $GREEN "Running test..."
echo ""

if $K6_CMD; then
    echo ""
    print_color $GREEN "✅ Test completed successfully!"
    
    if [ -n "$OUTPUT_FILE" ]; then
        print_color $GREEN "Results saved to: $OUTPUT_FILE"
    fi
    
    # Check if HTML report was generated
    HTML_REPORT="results/summary.html"
    if [ -f "$HTML_REPORT" ]; then
        print_color $GREEN "HTML report generated: $HTML_REPORT"
        
        # Try to open HTML report
        case "$(uname -s)" in
            Darwin*)
                open "$HTML_REPORT"
                ;;
            Linux*)
                xdg-open "$HTML_REPORT" 2>/dev/null || true
                ;;
            CYGWIN*|MINGW*|MSYS*)
                start "$HTML_REPORT"
                ;;
        esac
    fi
else
    echo ""
    print_color $RED "❌ Test failed!"
    exit 1
fi

echo ""
print_color $BLUE "========================================"
echo ""
