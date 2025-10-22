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
    engeryErrors: [EnergyErrorSchema],
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

const SystemDataSchema = new mongoose.Schema({
  powercfg: PowercfgSchema,
  hardware_events: [HardwareEventSchema],
  application_events: [ApplicationEventSchema],
  perfmon: [PerfmonSchema],
  reliability: [ReliabilityEventSchema],
  ipAddress: String,
  createdAt: { type: Date, default: Date.now },
  deviceName: String,
  linkedCrashLogId: { type: mongoose.Schema.Types.ObjectId, ref: "CrashLog" },
});

const CrashDataSchema = new mongoose.Schema({
  minidumps: [MinidumpSchema],
  minidump_analyses: [MinidumpAnalysisSchema],
  full_memory_dump: FullMemoryDumpSchema,
  system_log_available: Boolean,
  system_events: [SystemEventSchema],
  wer_enabled: Boolean,
  wer_reports: [WERReportSchema],
  driver_verifier: DriverVerifierSchema,
  ipAddress: String,
  createdAt: { type: Date, default: Date.now },
  deviceName: String,
  linkedSystemLogId: { type: mongoose.Schema.Types.ObjectId, ref: "SystemLog" },
});

CrashDataSchema.index({ deviceName: 1 });
CrashDataSchema.index({ ipAddress: 1, createdAt: 1 });

SystemDataSchema.index({ deviceName: 1 });
SystemDataSchema.index({ ipAddress: 1, createdAt: 1 });

export const CrashLog = mongoose.model("CrashLog", CrashDataSchema);
export const SystemLog = mongoose.model("SystemLog", SystemDataSchema);
