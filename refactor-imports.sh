#!/bin/bash

# Script to help refactor imports from @dxos/schema to @dxos/types

echo "Files that import DataType from @dxos/schema:"
echo "==========================================="
grep -l "import.*DataType.*from.*@dxos/schema" packages/ -r --include="*.ts" --include="*.tsx" | grep -v "dist/" | grep -v "node_modules/"

echo -e "\n\nFiles that use DataType.Organization:"
echo "====================================="
grep -l "DataType\.Organization" packages/ -r --include="*.ts" --include="*.tsx" | grep -v "dist/" | grep -v "node_modules/"

echo -e "\n\nFiles that use DataType.Person:"
echo "==============================="
grep -l "DataType\.Person" packages/ -r --include="*.ts" --include="*.tsx" | grep -v "dist/" | grep -v "node_modules/"

echo -e "\n\nFiles that use DataType.Task:"
echo "============================="
grep -l "DataType\.Task" packages/ -r --include="*.ts" --include="*.tsx" | grep -v "dist/" | grep -v "node_modules/"

echo -e "\n\nSummary of changes needed:"
echo "========================="
echo "1. Remove 'import { DataType } from '@dxos/schema'"
echo "2. Add 'import { Organization, Person, Task } from '@dxos/types'"
echo "3. Replace 'DataType.Organization.Organization' with 'Organization.Organization'"
echo "4. Replace 'DataType.Person.Person' with 'Person.Person'"
echo "5. Replace 'DataType.Task.Task' with 'Task.Task'"
echo "6. Update any DataType.Organization.make() to Organization.make()"
echo "7. Update any DataType.Person.make() to Person.make()"
echo "8. Update any DataType.Task.make() to Task.make()"