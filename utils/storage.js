// 仅操作本应用的两个键；读取到损坏的数据时不覆盖，交由 UI 提示。
const CLOTHES_KEY = "minimalist-wardrobe:clothes";
const SETTINGS_KEY = "minimalist-wardrobe:settings";
const CATEGORIES = ["上装", "下装", "鞋子", "配饰"];
const THICKNESSES = ["轻薄", "适中", "厚实"];
let idSequence = 0;

function read(key) {
	try {
		return uni.getStorageSync(key);
	} catch (error) {
		throw new Error(
			`读取本地数据失败（${key}）：${error && error.message ? error.message : String(error)}`,
		);
	}
}

function write(key, value) {
	try {
		uni.setStorageSync(key, value);
	} catch (error) {
		throw new Error(
			`保存本地数据失败（${key}）：${error && error.message ? error.message : String(error)}`,
		);
	}
}

function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function isClothing(item) {
	return (
		isRecord(item) &&
		typeof item.id === "string" &&
		item.id.length > 0 &&
		typeof item.name === "string" &&
		typeof item.photo === "string" &&
		isStringArray(item.seasons) &&
		CATEGORIES.includes(item.category) &&
		typeof item.accessoryType === "string" &&
		typeof item.color === "string" &&
		isStringArray(item.styles) &&
		THICKNESSES.includes(item.thickness) &&
		typeof item.favorite === "boolean" &&
		typeof item.createdAt === "string" &&
		item.createdAt.length > 0 &&
		typeof item.updatedAt === "string" &&
		item.updatedAt.length > 0
	);
}

function cloneClothing(item) {
	return { ...item, seasons: [...item.seasons], styles: [...item.styles] };
}

// 数据写入成功后再尝试释放不再引用的持久照片；文件清理失败不回滚记录。
function removeUnusedPhoto(path, clothes) {
	if (
		!path ||
		clothes.some((item) => item.photo === path) ||
		typeof uni.removeSavedFile !== "function"
	)
		return;
	try {
		uni.removeSavedFile({ filePath: path, fail() {} });
	} catch (error) {
		/* 不影响已保存的数据 */
	}
}

function newId(clothes) {
	let id;
	do {
		idSequence += 1;
		id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${idSequence.toString(36)}`;
	} while (clothes.some((item) => item.id === id));
	return id;
}

/** @returns {import('../types').Clothing[]} */
export function getClothes() {
	const value = read(CLOTHES_KEY);
	if (value === "" || value === undefined) return [];
	if (
		!Array.isArray(value) ||
		!value.every(isClothing) ||
		new Set(value.map((item) => item.id)).size !== value.length
	) {
		throw new Error("衣物数据已损坏，未进行任何修改");
	}
	return value.map(cloneClothing);
}

/**
 * 新建时省略 id；传入已有 id 时更新并保留原创建时间。
 * @param {import('../types').ClothingInput} item
 * @returns {import('../types').Clothing}
 */
export function saveClothing(item) {
	if (
		!isRecord(item) ||
		(item.id !== undefined && (typeof item.id !== "string" || !item.id))
	) {
		throw new TypeError("衣物数据或 id 无效");
	}
	const clothes = getClothes();
	const index =
		item.id === undefined
			? -1
			: clothes.findIndex((clothing) => clothing.id === item.id);
	const previous = index < 0 ? null : clothes[index];
	const now = new Date().toISOString();
	const next = {
		id: previous ? previous.id : item.id || newId(clothes),
		name: "",
		photo: "",
		seasons: [],
		category: "",
		accessoryType: "",
		color: "",
		styles: [],
		thickness: "适中",
		favorite: false,
		...previous,
		...item,
		createdAt: previous ? previous.createdAt : now,
		updatedAt: now,
	};
	if (!isClothing(next))
		throw new TypeError("衣物字段无效，请检查分类、厚度及字段类型");
	const saved = cloneClothing(next);
	if (index < 0) clothes.push(saved);
	else clothes[index] = saved;
	write(CLOTHES_KEY, clothes);
	if (previous && previous.photo !== saved.photo)
		removeUnusedPhoto(previous.photo, clothes);
	return cloneClothing(saved);
}

/** @param {string} id @returns {boolean} 是否找到并删除。 */
export function deleteClothing(id) {
	const clothes = getClothes();
	const remaining = clothes.filter((item) => item.id !== id);
	if (remaining.length === clothes.length) return false;
	write(CLOTHES_KEY, remaining);
	clothes
		.filter((item) => item.id === id)
		.forEach((item) => removeUnusedPhoto(item.photo, remaining));
	return true;
}

/** @param {string} id @returns {import('../types').Clothing | null} 未找到时返回 null。 */
export function toggleFavorite(id) {
	const clothes = getClothes();
	const index = clothes.findIndex((item) => item.id === id);
	if (index < 0) return null;
	const updated = {
		...clothes[index],
		favorite: !clothes[index].favorite,
		updatedAt: new Date().toISOString(),
	};
	clothes[index] = updated;
	write(CLOTHES_KEY, clothes);
	return cloneClothing(updated);
}

/** 只清空衣物，不删除设置或其他本地数据。 */
export function clearClothes() {
	// 清空是用户确认后的显式操作；损坏的数据也允许清除。
	let clothes = [];
	try {
		clothes = getClothes();
	} catch (error) {
		/* 无法识别损坏记录中的照片 */
	}
	write(CLOTHES_KEY, []);
	clothes.forEach((item) => removeUnusedPhoto(item.photo, []));
}

/** @returns {import('../types').Settings} */
export function getSettings() {
	const value = read(SETTINGS_KEY);
	if (value === "" || value === undefined) return { festivalReminder: true };
	if (
		!isRecord(value) ||
		(value.festivalReminder !== undefined &&
			typeof value.festivalReminder !== "boolean")
	) {
		throw new Error("设置数据已损坏，未进行任何修改");
	}
	return {
		...value,
		festivalReminder:
			value.festivalReminder === undefined
				? true
				: value.festivalReminder,
	};
}

/**
 * 合并设置，返回保存后的设置。
 * @param {Partial<import('../types').Settings>} settings
 * @returns {import('../types').Settings}
 */
export function saveSettings(settings) {
	if (
		!isRecord(settings) ||
		(settings.festivalReminder !== undefined &&
			typeof settings.festivalReminder !== "boolean")
	) {
		throw new TypeError("设置字段无效");
	}
	const current = getSettings();
	const next = {
		...current,
		...settings,
		festivalReminder:
			settings.festivalReminder === undefined
				? current.festivalReminder
				: settings.festivalReminder,
	};
	write(SETTINGS_KEY, next);
	return { ...next };
}
