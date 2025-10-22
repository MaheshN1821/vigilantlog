import mongoose from "mongoose";

// Sub-schemas for nested structures
const MinidumpSchema = new mongoose.Schema(
  {
    file: String,
    modified_time: Number,
  },
  { _id: false }
);

const ParsedAnalysisSchema = new mongoose.Schema(
  {
    bugcheck_code: String,
    bugcheck_name: String,
    exception_code: String,
    exception_address: String,
    failing_driver: String,
    failure_bucket: String,
    failure_hash: String,
    process_name: String,
    system_uptime: String,
    crash_time: String,
    windows_version: String,
    hypervisor_present: String,
    key_values: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const MinidumpAnalysisSchema = new mongoose.Schema(
  {
    file: String,
    parsed_analysis: ParsedAnalysisSchema,
  },
  { _id: false }
);

const CrashInfoSchema = new mongoose.Schema(
  {
    bugcheck_code: String,
    bugcheck_name: String,
    failing_driver: String,
    process_name: String,
    crash_time: String,
  },
  { _id: false }
);

const FullMemoryDumpSchema = new mongoose.Schema(
  {
    exists: Boolean,
    file_size_mb: Number,
    last_modified: String,
    crash_info: CrashInfoSchema,
  },
  { _id: false }
);

const SystemEventSchema = new mongoose.Schema(
  {
    event_number: Number,
    log_name: String,
    source: String,
    date: String,
    event_id: String,
    level: String,
    description: String,
  },
  { _id: false }
);

const WERReportSummarySchema = new mongoose.Schema(
  {
    EventType: String,
    EventTime: String,
    ReportDescription: String,
    FriendlyEventName: String,
  },
  { _id: false }
);

const WERReportSchema = new mongoose.Schema(
  {
    report_dir: String,
    summary: WERReportSummarySchema,
  },
  { _id: false }
);

const DriverVerifierSchema = new mongoose.Schema(
  {
    verifier_enabled: Boolean,
    flags: [String],
  },
  { _id: false }
);

const EnergyErrorSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
  },
  { _id: false }
);

const EnergyReportSchema = new mongoose.Schema(
  {
    energyErrors: [EnergyErrorSchema],
    warnings: [EnergyErrorSchema],
  },
  { _id: false }
);

const BatteryReportSchema = new mongoose.Schema(
  {
    "COMPUTER NAME": String,
    "SYSTEM PRODUCT NAME": String,
    BIOS: String,
    "OS BUILD": String,
    "PLATFORM ROLE": String,
    "CONNECTED STANDBY": String,
    "REPORT TIME": String,
    "": String,
    NAME: String,
    MANUFACTURER: String,
    "SERIAL NUMBER": String,
    CHEMISTRY: String,
    "DESIGN CAPACITY": String,
    "FULL CHARGE CAPACITY": String,
    "CYCLE COUNT": String,
  },
  { _id: false, strict: false }
);

const PowercfgSchema = new mongoose.Schema(
  {
    energy_report: EnergyReportSchema,
    battery_report: BatteryReportSchema,
  },
  { _id: false }
);

const HardwareEventSchema = new mongoose.Schema(
  {
    TimeCreated: String,
    ProviderName: String,
    Level: Number,
    LevelDisplayName: String,
    Id: Number,
    Message: String,
  },
  { _id: false }
);

const ApplicationEventSchema = new mongoose.Schema(
  {
    TimeCreated: String,
    ProviderName: String,
    Level: Number,
    LevelDisplayName: String,
    Id: Number,
    Message: String,
  },
  { _id: false }
);

const PerfmonSchema = new mongoose.Schema(
  {
    timestamp: String,
    "% Processor Time": Number,
    "Available MBytes": Number,
    "Disk Read Bytes/sec": Number,
    "Disk Write Bytes/sec": Number,
  },
  { _id: false }
);

const ReliabilityEventSchema = new mongoose.Schema(
  {
    Id: Number,
    Level: Number,
    ProviderName: String,
    TimeCreated: String,
    Message: String,
  },
  { _id: false }
);

// COMBINED SCHEMA - All data in one document
const CombinedDiagnosticsSchema = new mongoose.Schema(
  {
    // Identifiers
    deviceName: { type: String, required: true, index: true },
    ipAddress: { type: String, required: true },
    uniqueIdentifier: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Crash Data (from API 1)
    crash_data: {
      minidumps: [MinidumpSchema],
      minidump_analyses: [MinidumpAnalysisSchema],
      full_memory_dump: FullMemoryDumpSchema,
      system_log_available: Boolean,
      system_events: [SystemEventSchema],
      wer_enabled: Boolean,
      wer_reports: [WERReportSchema],
      driver_verifier: DriverVerifierSchema,
    },

    // System Data (from API 2)
    system_data: {
      powercfg: PowercfgSchema,
      hardware_events: [HardwareEventSchema],
      application_events: [ApplicationEventSchema],
      perfmon: [PerfmonSchema],
      reliability: [ReliabilityEventSchema],
      timestamp: String,
    },

    // Metadata
    api1ReceivedAt: Date,
    api2ReceivedAt: Date,
    mergedAt: Date,
    timeDifference: Number,

    // TTL - Auto-delete after 2 hours
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 7200,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "combined_diagnostics",
  }
);

// Compound indexes
CombinedDiagnosticsSchema.index({ deviceName: 1, createdAt: -1 });
CombinedDiagnosticsSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method
CombinedDiagnosticsSchema.statics.getDevicesWithCrashes = async function (
  hours = 24
) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.distinct("deviceName", {
    createdAt: { $gte: startTime },
    "crash_data.minidumps.0": { $exists: true },
  });
};

export const CombinedDiagnostics = mongoose.model(
  "CombinedDiagnostics",
  CombinedDiagnosticsSchema
);
