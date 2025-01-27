export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "")

  // Check if the number is valid
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)

  if (match) {
    return "(" + match[1] + ") " + match[2] + "-" + match[3]
  }

  // If the number doesn't match the expected format, return the original
  return phoneNumber
}

