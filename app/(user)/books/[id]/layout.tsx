import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BookDetailsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== "USER" && role !== "ADMIN") {
    redirect("/register?notice=book-access-required");
  }

  return children;
}
