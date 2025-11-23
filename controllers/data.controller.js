import { CombinedDiagnostics } from "../models/CombinedDiagnostics.js";

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

const getRecoverySteps = async (req, res) => {
	try {
		const { type } = req.params;
		const { deviceName } = req.query;

		if (!deviceName) {
			return res.status(400).json({
				success: false,
				message: "Please provide deviceName!",
			});
		}

		let logData, recData;

		if (deviceName) {
			console.log(`Fetching Logs - Device Name: ${deviceName}`);
			logData = await fetchSystemLogsFromDB(deviceName, type);
			if (!logData) {
				return res.status(404).json({
					success: false,
					message: `No logs found for Device Name: ${deviceName}`,
				});
			}

			recData = await recoverySteps(logData, type);
			if (!recData) {
				return res.status(500).json({
					success: false,
					message: `Please try again later, currently not able to provide recovery steps!`,
				});
			}
		}

		return res.status(200).json({
			success: true,
			data: recData,
		});
	} catch (error) {
		return handlePredictionError(error, res, "GENERAL");
	}
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Centralized error handler for predictions
 */
function handlePredictionError(error, res, predictionType) {
	console.error(`Error in ${predictionType} prediction:`, error.message);

	if (error.response) {
		return res.status(error.response.status).json({
			success: false,
			message: `${predictionType} prediction service error`,
			error: error.response.data,
		});
	} else if (error.code === "ECONNREFUSED") {
		return res.status(503).json({
			success: false,
			message: "Prediction service is unavailable. Please try again later.",
		});
	} else if (error.code === "ETIMEDOUT") {
		return res.status(504).json({
			success: false,
			message: "Prediction service timeout. Please try again.",
		});
	} else {
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
}

/**
 * Fetch logs from database by Device Name
 */
async function fetchSystemLogsFromDB(deviceName, type) {
	let bosdLogs = {};
	let appCrashLogs = {};
	let shutDownLogs = {};
	let hangLogs = {};
	try {
		const logs = await CombinedDiagnostics.findOne({ deviceName }).sort({
			createdAt: -1,
		});

		if (!logs) throw new Error("No logs found for this device!");

		if (type === "BSOD") {
			bosdLogs = {
				record_id: 1,
				minidumps: logs?.crash_data?.minidumps,
				minidump_analysis: logs?.crash_data?.minidump_analyses,
				full_memory_dump: logs?.crash_data?.full_memory_dump,
				system_log_available: logs?.crash_data?.system_log_available,
				system_events: logs?.crash_data?.system_events,
				wer_enabled: logs?.crash_data?.wer_enabled,
				wer_reports: logs?.crash_data?.wer_reports,
				driver_verifier: logs?.crash_data?.driver_verifier,
			};

			return bosdLogs;
		}

		if (type === "HANG") {
			hangLogs = {
				record_id: 1,
				minidumps: logs?.crash_data?.minidumps,
				minidump_analysis: logs?.crash_data?.minidump_analyses,
				full_memory_dump: logs?.crash_data?.full_memory_dump,
				system_log_available: logs?.crash_data?.system_log_available,
				system_events: logs?.crash_data?.system_events,
				wer_enabled: logs?.crash_data?.wer_enabled,
				wer_reports: logs?.crash_data?.wer_reports,
				driver_verifier: logs?.crash_data?.driver_verifier,
				perfmon: logs?.system_data?.perfmon,
				reliability: logs?.system_data?.reliability,
			};

			return hangLogs;
		}

		if (type === "SHUT") {
			shutDownLogs = {
				record_id: 1,
				system_log_available: logs?.crash_data?.system_log_available,
				system_events: logs?.crash_data?.system_events,
				wer_enabled: logs?.crash_data?.wer_enabled,
				wer_reports: logs?.crash_data?.wer_reports,
				driver_verifier: logs?.crash_data?.driver_verifier,
				reliability: logs?.system_data?.reliability,
				powercfg: logs?.system_data?.powercfg,
				hardware_events: logs?.system_data?.hardware_events,
				minidumps: logs?.crash_data?.minidumps,
				minidump_analysis: logs?.crash_data?.minidump_analyses,
			};
			return shutDownLogs;
		}

		if (type === "APP") {
			appCrashLogs = {
				record_id: 1,
				application_events: logs?.system_data?.application_events,
				minidumps: logs?.crash_data?.minidumps,
				minidump_analysis: logs?.crash_data?.minidump_analyses,
				wer_enabled: logs?.crash_data?.wer_enabled,
				wer_reports: logs?.crash_data?.wer_reports,
				reliability: logs?.system_data?.reliability,
			};
			return appCrashLogs;
		}
	} catch (err) {
		console.log(err);
		return;
	}
}

/**
 * Generate issue type description for context
 */
function getIssueTypeContext(type) {
	const contexts = {
		BSOD: "Blue Screen of Death (BSOD) crash",
		HANG: "System hang or freeze",
		SHUT: "Unexpected system shutdown",
		APP: "Application crash",
	};
	return contexts[type] || "system issue";
}

/**
 * Call Perplexity API to get recovery steps based on logs
 */
async function recoverySteps(logs, type) {
	const apiKey = process.env.PERPLEXITY_API;

	if (!apiKey) {
		throw new Error("Perplexity API key not found in environment variables");
	}

	try {
		const issueContext = getIssueTypeContext(type);

		const recoveryPrompt = `You are an expert Windows system diagnostics and recovery specialist. Analyze the following system logs for a ${issueContext} and provide comprehensive recovery instructions.

**SYSTEM LOGS:**
${JSON.stringify(logs, null, 2)}

**YOUR TASK:**
1. **ANALYSIS PHASE:**
   - Carefully examine all provided log data including minidumps, system events, WER reports, driver information, and any other diagnostic data
   - Identify the root cause(s) of the issue based on error codes, stack traces, and event patterns
   - Determine if the issue is hardware-related, driver-related, software-related, or a combination
   - Assess the severity and potential data loss risks

2. **DIAGNOSIS:**
   - Provide a clear explanation of what went wrong
   - List all contributing factors identified in the logs
   - Explain technical details in user-friendly language
   - Highlight critical error codes or events found in the logs

3. **RECOVERY STEPS:**
   Provide detailed, step-by-step recovery instructions organized by priority:
   
   **IMMEDIATE ACTIONS (Critical - Do First):**
   - Emergency steps to prevent further damage
   - Data backup recommendations
   - Safe mode boot instructions if applicable
   
   **PRIMARY FIXES (Main Solutions):**
   - Step-by-step instructions to resolve the identified root cause
   - Include specific commands, registry edits, or configuration changes
   - Provide Windows version-specific instructions where relevant
   - Include screenshots descriptions or UI navigation paths
   
   **ALTERNATIVE SOLUTIONS (If Primary Fails):**
   - Backup approaches to fix the issue
   - Advanced troubleshooting steps
   - System restore or recovery options
   
   **PREVENTIVE MEASURES:**
   - How to prevent this issue from recurring
   - Recommended system maintenance
   - Update and configuration recommendations

4. **RESOURCES:**
   Provide relevant external resources:
   - YouTube tutorial links for visual learners (search for most relevant and recent videos)
   - Official Microsoft documentation links
   - Trusted tech support articles from sites like Tom's Hardware, PCWorld, or official vendor documentation
   - Community forum discussions for similar issues
   - Driver download pages if driver updates are needed

5. **VERIFICATION STEPS:**
   - How to verify the fix was successful
   - What to monitor after applying the fix
   - When to seek professional help

**FORMAT YOUR RESPONSE AS:**
- Use clear headings and subheadings
- Number all steps sequentially
- Use bullet points for lists
- Include WARNING boxes for critical steps
- Provide actual URLs for resources (YouTube, articles, documentation)
- Keep technical jargon minimal and explain when necessary

**IMPORTANT:**
- Be specific and actionable in every step
- Don't suggest generic solutions - tailor everything to the actual log data provided
- If certain log data is missing, note what additional diagnostics would help
- Prioritize solutions that don't require data loss
- Include time estimates for each major step`;

		const recoveryResponse = await fetch(PERPLEXITY_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "sonar-pro",
				messages: [
					{
						role: "system",
						content:
							"You are an expert Windows system diagnostics specialist with deep knowledge of crash analysis, system recovery, and troubleshooting. You provide detailed, accurate, and actionable recovery instructions based on diagnostic logs. You always include relevant external resources like YouTube tutorials and official documentation to help users recover their systems.",
					},
					{ role: "user", content: recoveryPrompt },
				],
				temperature: 0.2,
				max_tokens: 4000,
			}),
		});

		if (!recoveryResponse.ok) {
			throw new Error(
				`Perplexity API returned status ${recoveryResponse.status}`
			);
		}

		const recoveryData = await recoveryResponse.json();

		if (!recoveryData.choices || recoveryData.choices.length === 0) {
			console.error("Perplexity API error:", recoveryData);
			throw new Error("API did not return choices");
		}

		const recoveryContent = recoveryData.choices[0].message.content;

		console.log("Recovery Steps Generated:", recoveryContent);

		return {
			issueType: type,
			analysis: recoveryContent,
			timestamp: new Date().toISOString(),
		};
	} catch (err) {
		console.error("Error in recoverySteps:", err);
		throw err;
	}
}

export default getRecoverySteps;
