const normalizeText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizePhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00880')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `880${digits.slice(1)}`;
  return digits;
};

const samePackageCountries = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) return false;
  const normalizeCountries = countries => countries.map(normalizeText).filter(Boolean).sort();
  const leftCountries = normalizeCountries(left);
  const rightCountries = normalizeCountries(right);
  return leftCountries.length === rightCountries.length &&
    leftCountries.every((country, index) => country === rightCountries[index]);
};

const getDuplicateKey = (file) => {
  const fileType = file.fileType || 'Visa';
  if (fileType === 'Visa') {
    const passport = normalizeText(file.passportNo);
    const destination = normalizeText(file.destination);
    return passport && destination ? `${fileType}|${passport}|${destination}` : null;
  }

  if (fileType === 'Package') {
    const passport = normalizeText(file.mainPersonPassport);
    const countries = Array.isArray(file.packageCountries)
      ? file.packageCountries.map(normalizeText).filter(Boolean).sort()
      : [];
    return passport && countries.length ? `${fileType}|${passport}|${countries.join(',')}` : null;
  }

  const applicant = normalizeText(file.applicantName);
  const phone = normalizePhone(file.contactNo);
  if (!applicant || !phone) return null;

  if (fileType === 'Air Ticket') {
    const route = normalizeText(file.airlineRoute);
    return route ? `${fileType}|${applicant}|${phone}|${route}` : null;
  }

  if (fileType === 'Pick & Drop') {
    const pickup = normalizeText(file.pickupLocation);
    const dropoff = normalizeText(file.dropoffLocation);
    return pickup && dropoff ? `${fileType}|${applicant}|${phone}|${pickup}|${dropoff}` : null;
  }

  return null;
};

export const findPossibleFileDuplicates = (candidate, files) => {
  if (!candidate || !Array.isArray(files)) return [];
  const candidateType = candidate.fileType || 'Visa';

  return files.filter(file => {
    if (!file || (file.fileType || 'Visa') !== candidateType) return false;

    if (candidateType === 'Visa') {
      return normalizeText(candidate.passportNo) !== '' &&
        normalizeText(candidate.passportNo) === normalizeText(file.passportNo) &&
        normalizeText(candidate.destination) === normalizeText(file.destination);
    }

    if (candidateType === 'Package') {
      return normalizeText(candidate.mainPersonPassport) !== '' &&
        normalizeText(candidate.mainPersonPassport) === normalizeText(file.mainPersonPassport) &&
        samePackageCountries(candidate.packageCountries, file.packageCountries);
    }

    const sameApplicant = normalizeText(candidate.applicantName) !== '' &&
      normalizeText(candidate.applicantName) === normalizeText(file.applicantName);
    const samePhone = normalizePhone(candidate.contactNo) !== '' &&
      normalizePhone(candidate.contactNo) === normalizePhone(file.contactNo);

    if (!sameApplicant || !samePhone) return false;

    if (candidateType === 'Air Ticket') {
      return normalizeText(candidate.airlineRoute) !== '' &&
        normalizeText(candidate.airlineRoute) === normalizeText(file.airlineRoute);
    }

    if (candidateType === 'Pick & Drop') {
      return normalizeText(candidate.pickupLocation) !== '' &&
        normalizeText(candidate.pickupLocation) === normalizeText(file.pickupLocation) &&
        normalizeText(candidate.dropoffLocation) !== '' &&
        normalizeText(candidate.dropoffLocation) === normalizeText(file.dropoffLocation);
    }

    return false;
  });
};

export const findPossibleFileDuplicatePairs = (files) => {
  if (!Array.isArray(files)) return [];

  const filesByKey = new Map();
  for (const file of files) {
    if (!file?.id) continue;
    const key = getDuplicateKey(file);
    if (!key) continue;
    const group = filesByKey.get(key) || [];
    group.push(file);
    filesByKey.set(key, group);
  }

  const pairs = [];
  for (const group of filesByKey.values()) {
    for (let firstIndex = 0; firstIndex < group.length; firstIndex++) {
      const fileA = group[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < group.length; secondIndex++) {
        const fileB = group[secondIndex];
        if (fileA.id === fileB.id) continue;
        const fileIds = [fileA.id, fileB.id].sort();
        pairs.push({
          fileA,
          fileB,
          fileIds,
          reviewId: encodeURIComponent(fileIds.join('__'))
        });
      }
    }
  }
  return pairs;
};
