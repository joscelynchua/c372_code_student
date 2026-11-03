# Feature: Prepare payment details

## 1. User goal
As a pet owner, i want to make paymeny for a pet service.

## 2. Scope

This endpoint prepares and returns the selected service details for review only.

Use the server catalogue price. Do not accept a client-supplied payment amount.

## 3. Request

HTTP method: GET

URL: /payments/prepare

Input: serviceId

## 4. Service catalogue
The following is the canonical catalogue. Response serviceName values must match
the catalogue names exactly.

| ID | Service name | Price |
|---:|---|---:|
| 1 | Vaccination | 35 |
| 2 | Pet Grooming | 50 |
| 3 | Boarding | 80 |

## 5. Successful response

HTTP 200 with exactly five top-level JSON fields:
serviceId (number), serviceName (string), amount (number),
currency (string, "sgd"), status (string, "READY_FOR_PAYMENT").

amount must equal the selected service's catalogue price exactly.

Example:
{"serviceId":1,"serviceName":"Vaccination","amount":35,"currency":"sgd","status":"READY_FOR_PAYMENT"}

## 6. Unsuccessful response
Unknown service: HTTP 404 with {"error":"Service not found"}.

## 7. Acceptance criteria
For each criterion, send GET /payments/prepare with the indicated serviceId.
The location and format for supplying serviceId remain to be agreed.

AC1: serviceId=1 -> HTTP 200; Vaccination; amount 35; serviceId 1.
AC2: serviceId=2 -> HTTP 200; Pet Grooming; amount 50; serviceId 2.
AC3: serviceId=3 -> HTTP 200; Boarding; amount 80; serviceId 3.
AC4: serviceId=999 -> HTTP 404; the exact error object above.
AC5: Each success has exactly the five agreed fields,
correct types, catalogue values, "sgd" and "READY_FOR_PAYMENT".
Access: No login required for this classroom mock.
Out of scope: charging money, gateway integration, transactions,
new database tables, EJS pages or changes to existing features.

## 8. Open questions

1. Where and in what format is serviceId supplied in the request?
2. What should happen when serviceId is missing or malformed, such as
   non-numeric or decimal input?
3. Can catalogue prices have fractional values?
