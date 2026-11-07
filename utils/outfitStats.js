const DAY_MS = 24 * 60 * 60 * 1000;
export const IDLE_DAYS = 60;

/** @param {Date} date @returns {string} 本地日期 YYYY-MM-DD。 */
export function formatDate(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime()))
		throw new TypeError("日期必须是有效的 Date");
	const year = String(date.getFullYear()).padStart(4, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// 用 UTC 计算日期差，避免夏令时让一天不等于 24 小时。
function dayNumber(text) {
	const [year, month, day] = text.split("-").map(Number);
	return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function addDays(text, days) {
	const date = new Date((dayNumber(text) + days) * DAY_MS);
	return date.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
	return dayNumber(to) - dayNumber(from);
}

/**
 * 统计截至 today 的穿着情况；未来日期是计划，不计入。
 * @param {import('../types').OutfitLog[]} logs
 * @param {string} today
 * @returns {Record<string, import('../types').WearSummary>}
 */
export function summarizeWear(logs, today) {
	const summary = {};
	logs.forEach((log) => {
		if (log.date > today) return;
		log.itemIds.forEach((id) => {
			const entry = summary[id] || { count: 0, lastWorn: "" };
			entry.count += 1;
			if (log.date > entry.lastWorn) entry.lastWorn = log.date;
			summary[id] = entry;
		});
	});
	return summary;
}

/** @returns {number | null} 未填写价格或尚未穿过时返回 null。 */
export function costPerWear(price, count) {
	if (typeof price !== "number" || !count) return null;
	return price / count;
}

export function formatMoney(value) {
	return String(Math.round(value * 100) / 100);
}

/** 从 today（或昨天，今天还没记时）往回数连续记录的天数。 */
export function recordStreak(logs, today) {
	const dates = new Set(logs.map((log) => log.date));
	let cursor = dates.has(today) ? today : addDays(today, -1);
	let streak = 0;
	while (dates.has(cursor)) {
		streak += 1;
		cursor = addDays(cursor, -1);
	}
	return streak;
}

/**
 * @param {import('../types').Clothing[]} clothes
 * @param {import('../types').OutfitLog[]} logs
 * @param {string} today
 */
export function buildWardrobeStats(clothes, logs, today) {
	const wear = summarizeWear(logs, today);
	const month = today.slice(0, 7);
	const rows = clothes.map((item) => {
		const entry = wear[item.id] || { count: 0, lastWorn: "" };
		const lastActive = entry.lastWorn || item.createdAt.slice(0, 10);
		return {
			item,
			count: entry.count,
			lastWorn: entry.lastWorn,
			idleDays: daysBetween(lastActive, today),
			cost: costPerWear(item.price, entry.count),
		};
	});
	return {
		totalItems: clothes.length,
		wornItems: rows.filter((row) => row.count > 0).length,
		totalValue: clothes.reduce((sum, item) => sum + (item.price || 0), 0),
		monthDays: logs.filter(
			(log) => log.date <= today && log.date.startsWith(month),
		).length,
		streak: recordStreak(logs, today),
		mostWorn: rows
			.filter((row) => row.count > 0)
			.sort((a, b) => b.count - a.count)
			.slice(0, 5),
		idle: rows
			.filter((row) => row.idleDays >= IDLE_DAYS)
			.sort((a, b) => b.idleDays - a.idleDays)
			.slice(0, 5),
		bestValue: rows
			.filter((row) => row.cost !== null)
			.sort((a, b) => a.cost - b.cost)
			.slice(0, 5),
	};
}
