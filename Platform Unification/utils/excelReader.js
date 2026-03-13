import xlsx from 'xlsx';

export function getTestData(filePath, sheetName = null) {
  const workbook = xlsx.readFile(filePath);
  const name = sheetName ?? workbook.SheetNames[0]; // default to first sheet
  const sheet = workbook.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const constants = {};

  // rows like: [ 'Url', 'Abc' ]
  for (const [key, value] of rows) {
    if (!key) continue;
    constants[String(key).trim()] = String(value).trim();
  }
 

  return constants;
}
