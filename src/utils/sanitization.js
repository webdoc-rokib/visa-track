import { validateDateFormat } from './dateValidation';

const DEFAULT_MAX_LENGTH = 255;

const trimAndNormalize = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.replace(/\s+/g, ' ');
};

export const sanitizeInput = (value, options = {}) => {
  const maxLength = typeof options.maxLength === 'number' ? options.maxLength : DEFAULT_MAX_LENGTH;
  const sanitized = trimAndNormalize(value);
  return sanitized.length <= maxLength ? sanitized : sanitized.slice(0, maxLength);
};

export const validateFileData = (data) => {
  const errors = {};

  const applicantName = sanitizeInput(data.applicantName, { maxLength: 100 });
  if (!applicantName) {
    errors.applicantName = 'Applicant name is required';
  }

  const contactNo = sanitizeInput(data.contactNo, { maxLength: 20 });
  if (!contactNo) {
    errors.contactNo = 'Contact number is required';
  }

  const fileType = sanitizeInput(data.fileType);
  if (!fileType) {
    errors.fileType = 'File type is required';
  }

  if (fileType === 'Visa') {
    const passportNo = sanitizeInput(data.passportNo, { maxLength: 30 });
    if (!passportNo) {
      errors.passportNo = 'Passport number is required';
    }

    const destination = sanitizeInput(data.destination, { maxLength: 50 });
    if (!destination) {
      errors.destination = 'Destination is required';
    }

    if (data.serviceCharge !== undefined && data.serviceCharge !== null && data.serviceCharge !== '') {
      const serviceCharge = Number(data.serviceCharge);
      if (Number.isNaN(serviceCharge) || serviceCharge < 0) {
        errors.serviceCharge = 'Service charge must be a non-negative number';
      }
    }

    if (data.cost !== undefined && data.cost !== null && data.cost !== '') {
      const cost = Number(data.cost);
      if (Number.isNaN(cost) || cost < 0) {
        errors.cost = 'Cost must be a non-negative number';
      }
    }

    if (data.reminderDate) {
      const dateValidation = validateDateFormat(data.reminderDate);
      if (!dateValidation.isValid) {
        errors.reminderDate = dateValidation.error;
      }
    }
  }

  if (fileType === 'Air Ticket') {
    const airlineRoute = sanitizeInput(data.airlineRoute);
    if (!airlineRoute) {
      errors.airlineRoute = 'Route is required';
    }

    const airlineSalePriceValue =
      data.airlineSalePrice !== undefined &&
      data.airlineSalePrice !== null &&
      String(data.airlineSalePrice).trim() !== ''
        ? data.airlineSalePrice
        : data.serviceCharge;

    if (airlineSalePriceValue === undefined || airlineSalePriceValue === null || String(airlineSalePriceValue).trim() === '') {
      errors.airlineSalePrice = 'Sale price is required';
    } else {
      const airlineSalePrice = Number(airlineSalePriceValue);
      if (!Number.isFinite(airlineSalePrice) || airlineSalePrice < 0) {
        errors.airlineSalePrice = 'Sale price must be a non-negative number';
      }
    }

    const airlineCostPriceValue =
      data.airlineCostPrice !== undefined &&
      data.airlineCostPrice !== null &&
      String(data.airlineCostPrice).trim() !== ''
        ? data.airlineCostPrice
        : data.cost;

    if (airlineCostPriceValue === undefined || airlineCostPriceValue === null || String(airlineCostPriceValue).trim() === '') {
      errors.airlineCostPrice = 'Cost price is required';
    } else {
      const airlineCostPrice = Number(airlineCostPriceValue);
      if (!Number.isFinite(airlineCostPrice) || airlineCostPrice < 0) {
        errors.airlineCostPrice = 'Cost price must be a non-negative number';
      }
    }

    const contactNo = sanitizeInput(data.contactNo, { maxLength: 20 });
    if (!contactNo) {
      errors.contactNo = 'Contact number is required';
    }
  }

  if (fileType === 'Pick & Drop') {
    const pickupLocation = sanitizeInput(data.pickupLocation, { maxLength: 100 });
    if (!pickupLocation) {
      errors.pickupLocation = 'Pickup location is required';
    }

    const dropoffLocation = sanitizeInput(data.dropoffLocation, { maxLength: 100 });
    if (!dropoffLocation) {
      errors.dropoffLocation = 'Dropoff location is required';
    }

    if (data.numberOfPersons === undefined || data.numberOfPersons === null || data.numberOfPersons === '') {
      errors.numberOfPersons = 'Number of persons is required';
    } else {
      const numberOfPersons = Number(data.numberOfPersons);
      if (!Number.isInteger(numberOfPersons) || numberOfPersons < 1) {
        errors.numberOfPersons = 'Number of persons must be a whole number greater than zero';
      }
    }

    if (data.salePrice === undefined || data.salePrice === null || data.salePrice === '') {
      errors.salePrice = 'Sale price is required';
    } else {
      const salePrice = Number(data.salePrice);
      if (!Number.isFinite(salePrice) || salePrice < 0) {
        errors.salePrice = 'Sale price must be a non-negative number';
      }
    }

    if (data.costPrice === undefined || data.costPrice === null || data.costPrice === '') {
      errors.costPrice = 'Cost price is required';
    } else {
      const costPrice = Number(data.costPrice);
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        errors.costPrice = 'Cost price must be a non-negative number';
      }
    }

    const contactNo = sanitizeInput(data.contactNo, { maxLength: 20 });
    if (!contactNo) {
      errors.contactNo = 'Contact number is required';
    }
  }

  if (fileType === 'Package') {
    if (!Array.isArray(data.packageCountries) || data.packageCountries.length === 0) {
      errors.packageCountries = 'At least one package country is required';
    }

    const packageNights = data.packageNights;
    if (packageNights === undefined || packageNights === null) {
      errors.packageNights = 'Please enter nights for selected countries';
    } else if (typeof packageNights === 'object' && !Array.isArray(packageNights)) {
      const missingCountry = Array.isArray(data.packageCountries)
        ? data.packageCountries.find(country => packageNights[country] === undefined || packageNights[country] === '')
        : null;
      const invalidCountry = Object.entries(packageNights).find(([country, nights]) => {
        const value = Number(nights);
        return !Number.isInteger(value) || value < 1;
      });

      if (missingCountry) {
        errors.packageNights = `Please enter nights for ${missingCountry}`;
      } else if (invalidCountry) {
        errors.packageNights = 'Package nights must be whole numbers greater than zero for selected countries';
      }
    } else {
      const nights = Number(packageNights);
      if (!Number.isInteger(nights) || nights < 1) {
        errors.packageNights = 'Package nights must be a whole number greater than zero';
      }
    }

    if (data.packageSalePrice === undefined || data.packageSalePrice === null || data.packageSalePrice === '') {
      errors.packageSalePrice = 'Package sale price is required';
    } else {
      const packageSalePrice = Number(data.packageSalePrice);
      if (!Number.isFinite(packageSalePrice) || packageSalePrice < 0) {
        errors.packageSalePrice = 'Package sale price must be a non-negative number';
      }
    }

    if (data.packageCostPrice === undefined || data.packageCostPrice === null || data.packageCostPrice === '') {
      errors.packageCostPrice = 'Package cost price is required';
    } else {
      const packageCostPrice = Number(data.packageCostPrice);
      if (!Number.isFinite(packageCostPrice) || packageCostPrice < 0) {
        errors.packageCostPrice = 'Package cost price must be a non-negative number';
      }
    }

    if (data.numberOfPersons === undefined || data.numberOfPersons === null || data.numberOfPersons === '') {
      errors.numberOfPersons = 'Number of persons is required';
    } else {
      const numberOfPersons = Number(data.numberOfPersons);
      if (!Number.isInteger(numberOfPersons) || numberOfPersons < 1) {
        errors.numberOfPersons = 'Number of persons must be a whole number greater than zero';
      }
    }

    const mainPersonPassport = sanitizeInput(data.mainPersonPassport, { maxLength: 30 });
    if (!mainPersonPassport) {
      errors.mainPersonPassport = 'Main person passport number is required';
    }

    const contactNo = sanitizeInput(data.contactNo, { maxLength: 20 });
    if (!contactNo) {
      errors.contactNo = 'Contact number is required';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateNote = (note) => {
  const sanitizedNote = sanitizeInput(note, { maxLength: 500 });

  if (!sanitizedNote) {
    return { isValid: false, error: 'Note cannot be empty' };
  }

  return {
    isValid: true,
    value: sanitizedNote
  };
};
