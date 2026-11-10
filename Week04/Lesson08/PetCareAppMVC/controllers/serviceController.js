const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const serviceBookingModel = require('../models/serviceBookingModel');

const VALIDATION_MESSAGE = 'Choose a pet, service, and valid booking date.';
const UNAVAILABLE_MESSAGE = 'That pet or service is unavailable for booking.';
const DATABASE_MESSAGE = 'Unable to create the booking. Please try again.';

function getLocalToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parsePositiveId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isValidBookingDate(value, today) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return false;
  if (
    parsedDate.getFullYear() !== Number(value.slice(0, 4)) ||
    parsedDate.getMonth() + 1 !== Number(value.slice(5, 7)) ||
    parsedDate.getDate() !== Number(value.slice(8, 10))
  ) {
    return false;
  }
  return value >= today;
}

function getFlashMessages(req) {
  return {
    messages: req.flash('success'),
    errors: req.flash('error')
  };
}

function listServices(req, res) {
  const ownerId = req.session.user.id;

  petModel.getPetsByOwner(ownerId, (petError, pets) => {
    if (petError) {
      console.error(petError);
      return res.status(500).send('Unable to load pets.');
    }

    serviceModel.getActiveServices((serviceError, services) => {
      if (serviceError) {
        console.error(serviceError);
        return res.status(500).send('Unable to load services.');
      }

      const requestedPetId = req.query.petId;
      const selectedPet = pets.find((pet) => String(pet.id) === String(requestedPetId));

      return res.render('services', {
        pets,
        services,
        selectedPetId: selectedPet ? String(selectedPet.id) : '',
        today: getLocalToday(),
        ...getFlashMessages(req),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const petId = parsePositiveId(req.body.petId);
  const serviceId = parsePositiveId(req.body.serviceId);
  const bookingDate = req.body.bookingDate;

  if (!petId || !serviceId || !isValidBookingDate(bookingDate, getLocalToday())) {
    req.flash('error', VALIDATION_MESSAGE);
    return res.redirect('/services');
  }

  serviceBookingModel.createPendingBooking(
    req.session.user.id,
    petId,
    serviceId,
    bookingDate,
    (error, booking) => {
      if (error) {
        console.error(error);
        req.flash('error', DATABASE_MESSAGE);
        return res.redirect(`/services?petId=${encodeURIComponent(petId)}`);
      }

      if (!booking) {
        req.flash('error', UNAVAILABLE_MESSAGE);
        return res.redirect('/services');
      }

      req.flash('success', 'Booking created. Payment is pending; no payment has been processed.');
      return res.redirect('/bookings');
    }
  );
}

function listBookings(req, res) {
  serviceBookingModel.getBookingsByOwner(req.session.user.id, (error, bookings) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Unable to load booking history.');
    }

    return res.render('bookings', {
      bookings,
      ...getFlashMessages(req),
      session: req.session
    });
  });
}

module.exports = { listServices, createBooking, listBookings };
