import { NextResponse } from "next/server";

type RegisterPayload = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  password: string;
  timezone: string;
  language: "en" | "pl";
};

export async function POST(request: Request) {
  const payload = (await request.json()) as RegisterPayload;

  await new Promise((resolve) => setTimeout(resolve, 1200));

  return NextResponse.json({
    success: true,
    received: {
      ...payload,
      password: "********",
    },
  });
}
