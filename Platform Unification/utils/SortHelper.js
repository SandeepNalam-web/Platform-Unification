export function isSorted(arr, order = 'asc', type = 'string') {
  if (!Array.isArray(arr)) {
    throw new Error(`isSorted expects an array, but got ${typeof arr}`);
  }

  const normalized = arr.map(v => String(v).trim());

  // Convert values if type = 'date' or 'number'
  let processed;
  if (type === 'date') {
    processed = normalized.map(v => new Date(v));
  } else if (type === 'number') {
    processed = normalized.map(v => Number(v));
  } else {
    processed = normalized;
  }

  // Create a sorted copy based on type + order
  const sorted = [...processed].sort((a, b) => {
    if (type === 'string') {
      return order === 'asc'
        ? a.localeCompare(b)
        : b.localeCompare(a);
    }
    if (type === 'number' || type === 'date') {
      return order === 'asc' ? a - b : b - a;
    }
  });

  // Compare element by element
  return processed.every((val, idx) => val === sorted[idx]);
}
