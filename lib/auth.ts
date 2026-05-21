export function loginIdToEmail(loginId: string) {
  const normalized = loginId.trim().toLowerCase();
  return normalized.includes("@") ? normalized : `${normalized}@hpcl.test`;
}

export const testCredentials = [
  { role: "Admin", loginId: "admin1", password: "admin1234", access: "1979 - HPCL Vijayawada Terminal" },
  { role: "Admin", loginId: "admin2", password: "admin1234", access: "1915 - HPCL Ramagundam IRD" },
  { role: "Employee", loginId: "employee1", password: "employee1234", access: "Both terminals" },
  { role: "Employee", loginId: "employee2", password: "employee1234", access: "Both terminals" },
];
