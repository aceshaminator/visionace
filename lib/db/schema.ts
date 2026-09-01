import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  real,
  date,
  jsonb,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Better Auth tables (do not rename columns)
// ---------------------------------------------------------------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// App tables (plain userId column for per-user scoping, no FK by default)
// ---------------------------------------------------------------------------
export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  score: integer("score").notNull(),
  riskLevel: text("riskLevel").notNull(),
  heartRate: integer("heartRate"),
  temperature: real("temperature"),
  spo2: integer("spo2"),
  respiratoryRate: integer("respiratoryRate"),
  symptoms: jsonb("symptoms").notNull().default([]),
  flags: jsonb("flags").notNull().default([]),
  insights: jsonb("insights").notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const pregnancyLogs = pgTable("pregnancy_logs", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  logDate: date("logDate").notNull(),
  bbt: real("bbt"),
  cycleDay: integer("cycleDay"),
  missedCycle: boolean("missedCycle").notNull().default(false),
  symptoms: jsonb("symptoms").notNull().default([]),
  warningFlags: jsonb("warningFlags").notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  entryDate: date("entryDate").notNull(),
  mood: integer("mood").notNull(),
  stress: integer("stress").notNull(),
  energy: integer("energy").notNull(),
  focus: integer("focus").notNull(),
  sleepHours: real("sleepHours"),
  note: text("note"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  bio: text("bio").notNull(),
  modes: jsonb("modes").notNull().default([]),
  rating: real("rating").notNull().default(5),
  reviews: integer("reviews").notNull().default(0),
  nextAvailable: text("nextAvailable"),
  languages: jsonb("languages").notNull().default([]),
  acceptsUrgent: boolean("acceptsUrgent").notNull().default(false),
})

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  providerId: integer("providerId").notNull(),
  mode: text("mode").notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("upcoming"),
  urgent: boolean("urgent").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  relation: text("relation").notNull(),
  generation: integer("generation").notNull().default(0),
  conditions: jsonb("conditions").notNull().default([]),
  dnaMarkers: jsonb("dnaMarkers").notNull().default([]),
  living: boolean("living").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  readMinutes: integer("readMinutes").notNull().default(3),
  tags: jsonb("tags").notNull().default([]),
  publishedAt: date("publishedAt").notNull().defaultNow(),
})
