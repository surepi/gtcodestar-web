#!/bin/bash
# Frontend Language Code Migration Script: cn → zh-hans
# Run from gtcodestar/frontend directory

set -e

echo "================================================"
echo "Frontend Language Code Migration: cn → zh-hans"
echo "================================================"
echo ""

# Check if we're in the frontend directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "Error: This script must be run from the frontend directory"
    exit 1
fi

echo "Creating backup branch..."
BACKUP_BRANCH="backup/lang-migration-$(date +%Y%m%d_%H%M%S)"
git checkout -b "$BACKUP_BRANCH"
git checkout -

echo ""
echo "Step 1: Updating type definitions..."

# Update component type definitions
find src/components -name "*.astro" -exec sed -i 's/"en" | "cn"/"en" | "zh-hans"/g' {} \;
echo "  ✓ Updated component type definitions"

# Update admin context types
sed -i 's/AdminContentLang = "en" | "cn"/AdminContentLang = "en" | "zh-hans"/g' src/admin/context/LocaleContext.tsx
sed -i 's/stored === "cn"/stored === "zh-hans"/g' src/admin/context/LocaleContext.tsx
echo "  ✓ Updated admin context types"

echo ""
echo "Step 2: Replacing hardcoded 'cn' with 'zh-hans'..."

# Update API calls in pages
find src/pages -type f \( -name "*.astro" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/lang=cn/lang=zh-hans/g' {} \;
find src/pages -type f \( -name "*.astro" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/lang: "cn"/lang: "zh-hans"/g' {} \;
find src/pages -type f \( -name "*.astro" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/=== "cn"/=== "zh-hans"/g' {} \;
echo "  ✓ Updated page files"

# Update admin files
find src/admin -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/value="cn"/value="zh-hans"/g' {} \;
find src/admin -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/=== "cn"/=== "zh-hans"/g' {} \;
echo "  ✓ Updated admin files"

# Update components
find src/components -type f -name "*.astro" -exec sed -i 's/lang: "cn"/lang: "zh-hans"/g' {} \;
echo "  ✓ Updated component files"

echo ""
echo "Step 3: Verifying i18n.ts is already updated..."
if grep -q 'return locale === "zh-hans" ? "zh-hans" : "en"' src/lib/i18n.ts; then
    echo "  ✓ i18n.ts already updated"
else
    echo "  ⚠ Warning: i18n.ts may need manual review"
fi

echo ""
echo "Step 4: Running verification..."
echo ""

# Check for remaining 'cn' references that might be problematic
echo "Checking for remaining 'cn' references..."
REMAINING=$(grep -r '"cn"' src/ --include="*.ts" --include="*.tsx" --include="*.astro" 2>/dev/null | grep -v "zh-hans" | grep -v "node_modules" | wc -l)

if [ "$REMAINING" -gt 0 ]; then
    echo "  ⚠ Warning: Found $REMAINING potential 'cn' references:"
    grep -r '"cn"' src/ --include="*.ts" --include="*.tsx" --include="*.astro" 2>/dev/null | grep -v "zh-hans" | grep -v "node_modules" | head -10
    echo ""
    echo "  Please review these manually to ensure they're not language codes"
else
    echo "  ✓ No problematic 'cn' references found"
fi

echo ""
echo "Step 5: Showing changes..."
echo ""
git diff --stat

echo ""
echo "================================================"
echo "Migration script completed!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Test the build: npm run build"
echo "3. If everything looks good, commit:"
echo "   git add ."
echo "   git commit -m 'refactor: migrate language code from cn to zh-hans'"
echo ""
echo "4. If you need to rollback:"
echo "   git reset --hard HEAD"
echo "   git checkout $BACKUP_BRANCH"
echo ""
echo "Backup branch created: $BACKUP_BRANCH"
echo ""
