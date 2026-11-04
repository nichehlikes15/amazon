// Same email check as valid_email() in backend/app.py, so the form can say
// straight away when an email can't be right. The server checks again.
const EMAIL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/

export const EMAIL_ERROR = 'Please enter a valid email address, for example name@example.com.'

export function isValidEmail(value) {
  const email = String(value || '').trim()
  return email.length <= 254 && email.split('@')[0].length <= 64 && EMAIL_RE.test(email)
}
