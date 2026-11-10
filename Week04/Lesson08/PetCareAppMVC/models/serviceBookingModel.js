const connection = require('../config/db');

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  connection.getConnection((connectionError, transaction) => {
    if (connectionError) return callback(connectionError);

    let completed = false;

    function finish(error, result) {
      if (completed) return;
      completed = true;

      try {
        transaction.release();
      } catch (releaseError) {
        if (error) {
          error.releaseError = releaseError;
        } else {
          error = new Error('Unable to release the booking database connection.');
          error.releaseError = releaseError;
        }
      }

      callback(error, result);
    }

    function rollback(error, result) {
      try {
        transaction.rollback((rollbackError) => {
          if (rollbackError) {
            const combinedError = new Error('Booking transaction rollback failed.');
            combinedError.originalError = error || null;
            combinedError.rollbackError = rollbackError;
            return finish(combinedError);
          }
          finish(error, result);
        });
      } catch (rollbackError) {
        const combinedError = new Error('Booking transaction rollback failed.');
        combinedError.originalError = error || null;
        combinedError.rollbackError = rollbackError;
        finish(combinedError);
      }
    }

    function query(sql, params, queryCallback) {
      try {
        transaction.query(sql, params, queryCallback);
      } catch (error) {
        rollback(error);
      }
    }

    try {
      transaction.beginTransaction((beginError) => {
        if (beginError) return finish(beginError);

        const bookingSql = `
          INSERT INTO service_bookings
            (pet_id, service_id, booking_status, booked_price, booking_date)
          SELECT pets.id, services.id, 'pending', services.price, ?
          FROM pets
          INNER JOIN services
            ON services.id = ? AND services.is_active = 1
          WHERE pets.id = ? AND pets.owner_id = ?
        `;

        query(
          bookingSql,
          [bookingDate, serviceId, petId, ownerId],
          (bookingError, bookingResult) => {
            if (bookingError) return rollback(bookingError);
            if (bookingResult.affectedRows === 0) return rollback(null, null);
            if (bookingResult.affectedRows !== 1 || !bookingResult.insertId) {
              return rollback(new Error('Unexpected booking insert result.'));
            }

            const bookingId = bookingResult.insertId;
            const paymentSql = `
              INSERT INTO payments (booking_id, amount, payment_status)
              SELECT id, booked_price, 'pending'
              FROM service_bookings
              WHERE id = ?
            `;

            query(paymentSql, [bookingId], (paymentError, paymentResult) => {
              if (paymentError) return rollback(paymentError);
              if (paymentResult.affectedRows !== 1 || !paymentResult.insertId) {
                return rollback(new Error('Unexpected payment insert result.'));
              }

              try {
                transaction.commit((commitError) => {
                  if (commitError) return rollback(commitError);
                  finish(null, { bookingId, paymentId: paymentResult.insertId });
                });
              } catch (commitError) {
                rollback(commitError);
              }
            });
          }
        );
      });
    } catch (error) {
      finish(error);
    }
  });
}

function getBookingsByOwner(ownerId, callback) {
  const sql = `
    SELECT
      service_bookings.id AS booking_id,
      DATE_FORMAT(service_bookings.booking_date, '%Y-%m-%d') AS booking_date,
      pets.name AS pet_name,
      services.name AS service_name,
      service_bookings.booked_price,
      service_bookings.booking_status,
      payments.payment_status,
      payments.payment_reference,
      service_bookings.created_at
    FROM service_bookings
    INNER JOIN pets ON pets.id = service_bookings.pet_id
    INNER JOIN services ON services.id = service_bookings.service_id
    LEFT JOIN payments ON payments.booking_id = service_bookings.id
    WHERE pets.owner_id = ?
    ORDER BY service_bookings.created_at DESC, service_bookings.id DESC
  `;
  connection.query(sql, [ownerId], callback);
}

module.exports = {
  createPendingBooking,
  getBookingsByOwner
};
