const files = [
  {fileType: 'VISA', applicantName: 'Alice', passportNo: 'A12345', fileId: 'VT-10001', destination: 'Nepal'},
  {fileType: 'PACKAGE', applicantName: 'Bob', mainPersonPassport: 'B98765', fileId: 'VT-10002', destination: 'Thailand'},
  {fileType: 'AIR_TICKET', applicantName: 'Charlie', fileId: 'VT-10003'},
];

function filterFiles(files, searchTerm, destFilter) {
  const normalizedSearch = (searchTerm || '').trim().toLowerCase();
  const filteredFiles = files.filter(f => {
    if (!normalizedSearch) return destFilter ? f.destination === destFilter : true;

    const matchesSearch = 
      (f.applicantName && f.applicantName.toLowerCase().includes(normalizedSearch)) ||
      (f.passportNo && f.passportNo.toLowerCase().includes(normalizedSearch)) ||
      (f.mainPersonPassport && f.mainPersonPassport.toLowerCase().includes(normalizedSearch)) ||
      (f.destination && f.destination.toLowerCase().includes(normalizedSearch)) ||
      (f.fileId && f.fileId.toLowerCase().includes(normalizedSearch));

    const matchesDest = destFilter ? f.destination === destFilter : true;
    return matchesSearch && matchesDest;
  });
  return filteredFiles;
}

console.log('Search "Alice":', filterFiles(files, 'Alice').length === 1);
console.log('Search "A123":', filterFiles(files, 'A123').length === 1);
console.log('Search "B987":', filterFiles(files, 'B987').length === 1);
console.log('Search "VT-10003":', filterFiles(files, 'VT-10003').length === 1);
console.log('Search empty:', filterFiles(files, '').length === 3);
console.log('Destination filter Thailand:', filterFiles(files, '', 'Thailand').length === 1);
