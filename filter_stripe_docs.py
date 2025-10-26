#!/usr/bin/env python3
"""
Filter stripe-instuctions.md to keep only Node.js examples
Removes Ruby, Python, PHP, Java, .NET, and Go examples
"""

def filter_markdown(input_file, output_file):
    """Filter markdown to keep only Node.js code blocks and all documentation."""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    output_lines = []
    skip_section = False
    sections_skipped = 0
    lines_skipped = 0
    code_blocks_skipped = 0
    
    # Languages to filter out
    skip_languages = ['Ruby', 'Python', 'PHP', 'Java', '.NET', 'Go']
    skip_code_langs = ['ruby', 'python', 'php', 'java', 'dotnet', 'csharp', 'go']
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Detect language-specific section headers (#### Language)
        if line.strip().startswith('#### '):
            language = line.strip().replace('#### ', '').strip()
            
            # Check if this is a language section we should skip
            if language in skip_languages:
                skip_section = True
                sections_skipped += 1
                i += 1
                continue
            elif language == 'Node.js':
                # Keep Node.js sections
                skip_section = False
                output_lines.append(line)
            else:
                # Not a language-specific section, keep it
                skip_section = False
                output_lines.append(line)
        
        # If we're in a section to skip, skip all content until next #### header
        elif skip_section:
            # Check if we hit a higher-level header (###, ##, #) which ends the skip section
            if line.strip().startswith('### ') or line.strip().startswith('## ') or line.strip().startswith('# '):
                skip_section = False
                output_lines.append(line)
            else:
                lines_skipped += 1
                i += 1
                continue
        
        # Check for code blocks with non-Node.js language identifiers
        elif line.strip().startswith('```'):
            # Extract language identifier
            lang = line.strip().replace('```', '').strip().lower()
            
            # Check if this is a non-Node.js code block
            if lang in skip_code_langs:
                # Skip this entire code block
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    lines_skipped += 1
                    i += 1
                # Skip the closing ```
                if i < len(lines):
                    lines_skipped += 2  # Count opening and closing ```
                    i += 1
                    code_blocks_skipped += 1
                continue
            else:
                # Keep this code block (Node.js, javascript, typescript, or generic)
                output_lines.append(line)
        
        else:
            # Not skipping, keep the line
            output_lines.append(line)
        
        i += 1
    
    # Write filtered content
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(output_lines)
    
    print(f"✓ Filtered {input_file}")
    print(f"  - Removed {sections_skipped} language sections (Ruby, Python, PHP, Java, .NET, Go)")
    print(f"  - Removed {code_blocks_skipped} standalone non-Node.js code blocks")
    print(f"  - Skipped {lines_skipped} lines of non-Node.js content")
    print(f"  - Original: {len(lines)} lines")
    print(f"  - Filtered: {len(output_lines)} lines")
    print(f"  - Reduced by: {len(lines) - len(output_lines)} lines ({(1 - len(output_lines)/len(lines))*100:.1f}%)")


if __name__ == '__main__':
    filter_markdown('docs/stripe-instuctions.md', 'docs/stripe-instructions-filtered.md')

