const CATEGORIES = [
	["top", "上装"],
	["bottom", "下装"],
	["shoes", "鞋子"],
	["accessory", "配饰"],
];
const SEASONS = ["春", "夏", "秋", "冬"];

function seasonFromTemperature(temperature) {
	if (temperature < 10) return "冬";
	if (temperature >= 25) return "夏";
	return temperature < 17 ? "秋" : "春";
}

function normalizeSeason(season) {
	return typeof season === "string"
		? SEASONS.find((item) => season === item || season === `${item}季`)
		: undefined;
}

function seedNumber(seed) {
	if (typeof seed === "number" && Number.isFinite(seed))
		return Math.floor(seed);
	if (typeof seed !== "string") return 0;
	let hash = 0;
	for (let i = 0; i < seed.length; i++)
		hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) | 0;
	return hash;
}

function score(item, temperature, season) {
	// 不让温度极不匹配的厚度参与推荐，即使它是唯一一件。
	if (
		(item.thickness === "轻薄" && temperature < 13) ||
		(item.thickness === "适中" && (temperature < 3 || temperature > 33)) ||
		(item.thickness === "厚实" && temperature > 22)
	)
		return null;
	const ideal =
		item.thickness === "轻薄" ? 29 : item.thickness === "厚实" ? 5 : 18;
	let result = 50 - Math.abs(temperature - ideal);
	const seasons = Array.isArray(item.seasons)
		? item.seasons.map(normalizeSeason).filter(Boolean)
		: [];
	if (seasons.length) result += seasons.includes(season) ? 8 : -8;
	return result;
}

/**
 * 按摄氏温度挑选衣物。seed 为整数时递增可轮换同等合适的候选；
 * season 可显式传入春/夏/秋/冬（或春季等），否则按气温估算。
 * @param {import('../types').Clothing[]} clothes
 * @param {number} temperature 摄氏度
 * @param {import('../types').OutfitOptions} [options]
 * @returns {import('../types').OutfitRecommendation}
 */
export function recommendOutfit(clothes, temperature, options = {}) {
	if (!Array.isArray(clothes)) throw new TypeError("衣物列表必须是数组");
	if (typeof temperature !== "number" || !Number.isFinite(temperature))
		throw new TypeError("温度必须是有效的摄氏度数值");
	if (!options || typeof options !== "object" || Array.isArray(options))
		throw new TypeError("推荐选项无效");
	const season =
		normalizeSeason(options.season) || seasonFromTemperature(temperature);
	const seed = seedNumber(options.seed);
	const result = {
		top: null,
		bottom: null,
		shoes: null,
		accessory: null,
		missing: [],
	};

	CATEGORIES.forEach(([key, category]) => {
		const candidates = clothes
			.filter(
				(item) =>
					item &&
					item.category === category &&
					["轻薄", "适中", "厚实"].includes(item.thickness),
			)
			.map((item, index) => ({
				item,
				index,
				score: score(item, temperature, season),
			}))
			.filter((candidate) => candidate.score !== null)
			.sort((a, b) => b.score - a.score || a.index - b.index);
		if (!candidates.length) {
			if (category !== "配饰") result.missing.push(category);
			return;
		}
		// 只在评分接近最佳的候选中轮换，不为了换一套牺牲舒适度。
		const suitable = candidates.filter(
			(candidate) => candidate.score >= candidates[0].score - 10,
		);
		const index =
			((seed % suitable.length) + suitable.length) % suitable.length;
		result[key] = suitable[index].item;
	});
	return result;
}
