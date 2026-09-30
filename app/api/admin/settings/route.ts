import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const SETTINGS = {
  storeName: {
    key: "store.name",
    defaultValue: "BookStore",
    description: "The store name shown to administrators.",
    type: SettingType.STRING,
  },
  supportEmail: {
    key: "store.support_email",
    defaultValue: "",
    description: "The email address customers can use to contact support.",
    type: SettingType.STRING,
  },
} as const;

const updateSettingsSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100),
  supportEmail: z
    .string()
    .trim()
    .min(1, "Support email is required")
    .email("Enter a valid support email address")
    .max(254),
});

type SettingValues = z.infer<typeof updateSettingsSchema>;

async function requireAdmin() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}

async function readSettings(): Promise<SettingValues> {
  const rows = await prisma.systemSetting.findMany({
    where: {
      settingKey: { in: [SETTINGS.storeName.key, SETTINGS.supportEmail.key] },
    },
    select: { settingKey: true, settingValue: true },
  });
  const values = new Map(rows.map((row) => [row.settingKey, row.settingValue]));

  return {
    storeName: values.get(SETTINGS.storeName.key) ?? SETTINGS.storeName.defaultValue,
    supportEmail:
      values.get(SETTINGS.supportEmail.key) ?? SETTINGS.supportEmail.defaultValue,
  };
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ settings: await readSettings() });
  } catch (error) {
    console.error("Failed to fetch admin settings", error);
    return NextResponse.json(
      { error: "Failed to load settings. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const validation = updateSettingsSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field]) {
          errors[field] = issue.message;
        }
      }

      return NextResponse.json(
        { error: "Please correct the highlighted fields.", errors },
        { status: 400 }
      );
    }

    const settings = validation.data;
    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { settingKey: SETTINGS.storeName.key },
        update: {
          settingValue: settings.storeName,
          settingType: SETTINGS.storeName.type,
          description: SETTINGS.storeName.description,
        },
        create: {
          settingKey: SETTINGS.storeName.key,
          settingValue: settings.storeName,
          settingType: SETTINGS.storeName.type,
          description: SETTINGS.storeName.description,
        },
      }),
      prisma.systemSetting.upsert({
        where: { settingKey: SETTINGS.supportEmail.key },
        update: {
          settingValue: settings.supportEmail,
          settingType: SETTINGS.supportEmail.type,
          description: SETTINGS.supportEmail.description,
        },
        create: {
          settingKey: SETTINGS.supportEmail.key,
          settingValue: settings.supportEmail,
          settingType: SETTINGS.supportEmail.type,
          description: SETTINGS.supportEmail.description,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Settings saved successfully.",
      settings,
    });
  } catch (error) {
    console.error("Failed to save admin settings", error);
    return NextResponse.json(
      { error: "Failed to save settings. Please try again." },
      { status: 500 }
    );
  }
}
