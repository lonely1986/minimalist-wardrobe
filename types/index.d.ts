export type ClothingCategory = "上装" | "下装" | "鞋子" | "配饰";
export type Thickness = "轻薄" | "适中" | "厚实";
export type Season =
	| "春"
	| "夏"
	| "秋"
	| "冬"
	| "春季"
	| "夏季"
	| "秋季"
	| "冬季";

export interface Clothing {
	id: string;
	name: string;
	photo: string;
	seasons: string[];
	category: ClothingCategory;
	accessoryType: string;
	color: string;
	styles: string[];
	thickness: Thickness;
	favorite: boolean;
	/** ISO 8601 时间字符串。 */
	createdAt: string;
	/** ISO 8601 时间字符串。 */
	updatedAt: string;
}

/** 新建必须指定分类；传入已有 id 可部分更新。时间由存储模块维护。 */
export type ClothingInput =
	| (Partial<Omit<Clothing, "createdAt" | "updatedAt">> & {
			category: ClothingCategory;
	  })
	| (Partial<Omit<Clothing, "createdAt" | "updatedAt">> & { id: string });

export interface Settings {
	festivalReminder: boolean;
}

export interface OutfitOptions {
	/** 整数递增可轮换评分接近的候选；也可传字符串作为稳定种子。 */
	seed?: number | string;
	season?: Season;
}

export interface OutfitRecommendation {
	top: Clothing | null;
	bottom: Clothing | null;
	shoes: Clothing | null;
	accessory: Clothing | null;
	missing: Array<Exclude<ClothingCategory, "配饰">>;
}

export interface Festival {
	/** 本地日期，格式为 YYYY-MM-DD。 */
	date: string;
	name: string;
	message: string;
}
