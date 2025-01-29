#!/bin/bash

# Directories to search
DIRS="app components hooks lib"

# Function to print separator
print_separator() {
    echo
    echo "================================================================="
    echo "FILE: $1"
    echo "================================================================="
    echo
}

# Find and display files from each directory
for dir in $DIRS; do
    if [ -d "$dir" ]; then
        find "$dir" -type f -not -path "*/\.*" | while read -r file; do
            print_separator "$file"
            cat "$file"
            echo
            echo "-----------------------------------------------------------------"
        done
    fi
done

