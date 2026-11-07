<template>
	<view class="category-page page-shell">
		<view class="heading page-header"
			><text class="eyebrow heading-en">A PLACE FOR EVERYTHING</text
			><text class="page-title heading-title">衣物分类</text
			><text class="page-subtitle heading-subtitle"
				>分门别类，让每件喜爱都有归处。</text
			><view class="heading-seal"
				><text>拾</text><text class="seal-second-line">衣</text></view
			></view
		>
		<view class="section-top"
			><view
				><text class="section-en">BROWSE BY CATEGORY</text
				><text class="section-title section-name"
					>按品类寻衣</text
				></view
			><text class="total muted">共 {{ clothes.length }} 件</text></view
		>
		<view class="category-grid"
			><view
				v-for="(category, index) in categories"
				:key="category"
				class="category-tile card"
				:class="{ selected: selectedCategory === category }"
				@click="selectCategory(category)"
				><text class="tile-number">0{{ index + 1 }}</text
				><text class="tile-name">{{ category }}</text
				><text class="tile-count"
					>{{ categoryCount(category) }} 件衣物</text
				><text class="tile-mark">{{ marks[index] }}</text></view
			></view
		>
		<view class="collection-heading"
			><view
				><text class="section-en">YOUR COLLECTION</text
				><text class="section-title section-name">{{
					selectedCategory === "全部" ? "全部衣物" : selectedCategory
				}}</text></view
			><button class="add-button primary-button" @click="openForm()">
				＋ 添置衣物
			</button></view
		>
		<scroll-view class="filter-scroll" scroll-x :show-scrollbar="false"
			><view class="filter-options"
				><view
					v-for="option in seasonOptions"
					:key="option"
					class="filter-chip"
					:class="{ active: selectedSeason === option }"
					@click="selectedSeason = option"
					>{{ option === "全部" ? "全部季节" : option }}</view
				></view
			></scroll-view
		>
		<scroll-view
			v-if="selectedCategory === '配饰'"
			class="filter-scroll accessory-filter"
			scroll-x
			:show-scrollbar="false"
			><view class="filter-options"
				><view
					v-for="option in accessoryOptions"
					:key="option"
					class="filter-chip"
					:class="{ active: selectedAccessory === option }"
					@click="selectedAccessory = option"
					>{{ option === "全部" ? "全部配饰" : option }}</view
				></view
			></scroll-view
		>
		<view class="results-heading"
			><text>共 {{ filteredClothes.length }} 件</text
			><button
				v-if="selectedCategory !== '全部' || selectedSeason !== '全部'"
				class="reset-button"
				@click="resetFilters"
			>
				查看全部
			</button></view
		>
		<view v-if="loadError" class="empty-state empty"
			><text class="empty-title">衣物库暂时无法打开</text
			><text class="empty-copy">请稍后重新加载。</text
			><button class="empty-button" @click="refresh">
				重新加载
			</button></view
		>
		<view v-else-if="!filteredClothes.length" class="empty-state empty"
			><view class="empty-mark">衣</view
			><text class="empty-title">{{
				clothes.length ? "这里暂时没有衣物" : "还没有收藏衣物"
			}}</text
			><text class="empty-copy">{{
				clothes.length
					? "换个分类或季节，再寻找一番。"
					: "记录一件喜欢的衣物，开启你的衣橱。"
			}}</text
			><button
				v-if="!clothes.length"
				class="empty-button"
				@click="openForm()"
			>
				＋ 添加衣物</button
			><button v-else class="empty-button" @click="resetFilters">
				查看全部
			</button></view
		>
		<view v-else class="clothing-grid"
			><ClothingCard
				v-for="item in filteredClothes"
				:key="item.id"
				:item="item"
				:wear="wear[item.id]"
				@edit="openForm"
				@delete="confirmDelete"
				@favorite="favorite"
		/></view>
		<view class="page-ending">— &nbsp; 一衣一物，皆有温度 &nbsp; —</view>
		<ClothingForm
			v-if="formOpen"
			:item="editingItem"
			@close="closeForm"
			@saved="onSaved"
		/>
	</view>
</template>

<script>
import ClothingCard from "@/components/ClothingCard.vue";
import ClothingForm from "@/components/ClothingForm.vue";
import {
	getClothes,
	getOutfitLogs,
	deleteClothing,
	toggleFavorite,
} from "@/utils/storage.js";
import { formatDate, summarizeWear } from "@/utils/outfitStats.js";

export default {
	components: { ClothingCard, ClothingForm },
	data() {
		return {
			clothes: [],
			wear: {},
			categories: ["上装", "下装", "鞋子", "配饰"],
			marks: ["衣", "裳", "履", "饰"],
			seasonOptions: ["全部", "春", "夏", "秋", "冬"],
			accessoryOptions: ["全部", "围巾", "帽子", "首饰", "包包"],
			selectedCategory: "全部",
			selectedSeason: "全部",
			selectedAccessory: "全部",
			formOpen: false,
			editingItem: null,
			loadError: false,
			actionBusy: false,
			alive: true,
		};
	},
	computed: {
		filteredClothes() {
			return this.clothes.filter(
				(item) =>
					(this.selectedCategory === "全部" ||
						item.category === this.selectedCategory) &&
					(this.selectedSeason === "全部" ||
						(Array.isArray(item.seasons) &&
							(item.seasons.includes(this.selectedSeason) ||
								item.seasons.includes(
									this.selectedSeason + "季",
								)))) &&
					(this.selectedCategory !== "配饰" ||
						this.selectedAccessory === "全部" ||
						item.accessoryType === this.selectedAccessory),
			);
		},
	},
	onShow() {
		this.refresh();
	},
	onUnload() {
		this.alive = false;
	},
	methods: {
		refresh() {
			try {
				const data = getClothes();
				if (!Array.isArray(data)) throw new Error("Invalid clothes");
				this.clothes = data;
				this.loadError = false;
			} catch (error) {
				this.loadError = true;
				uni.showToast({ title: "衣物读取失败", icon: "none" });
			}
			try {
				this.wear = summarizeWear(
					getOutfitLogs(),
					formatDate(new Date()),
				);
			} catch (error) {
				// 日记损坏不影响衣物浏览，日记页会给出提示。
				this.wear = {};
			}
		},
		categoryCount(category) {
			return this.clothes.filter((item) => item.category === category)
				.length;
		},
		selectCategory(category) {
			this.selectedCategory =
				this.selectedCategory === category ? "全部" : category;
			this.selectedAccessory = "全部";
		},
		resetFilters() {
			this.selectedCategory = "全部";
			this.selectedSeason = "全部";
			this.selectedAccessory = "全部";
		},
		openForm(item) {
			this.editingItem = item || null;
			this.formOpen = true;
		},
		closeForm() {
			this.formOpen = false;
			this.editingItem = null;
		},
		onSaved() {
			this.closeForm();
			this.refresh();
			uni.showToast({ title: "保存成功", icon: "success" });
		},
		favorite(item) {
			if (this.actionBusy) return;
			this.actionBusy = true;
			try {
				const result = toggleFavorite(item.id);
				if (result === false || result === null)
					throw new Error("toggle failed");
				this.refresh();
				uni.$emit("clothes-changed");
			} catch (error) {
				uni.showToast({ title: "操作失败，请重试", icon: "none" });
			} finally {
				this.actionBusy = false;
			}
		},
		confirmDelete(item) {
			if (this.actionBusy) return;
			this.actionBusy = true;
			try {
				uni.showModal({
					title: "删除衣物",
					content: `确定删除「${item.name || "这件衣物"}」吗？`,
					confirmColor: "#82917c",
					success: (result) => {
						if (!this.alive || !result.confirm) return;
						try {
							if (deleteClothing(item.id) === false)
								throw new Error("delete failed");
							this.refresh();
							uni.$emit("clothes-changed");
							uni.showToast({ title: "已删除", icon: "success" });
						} catch (error) {
							uni.showToast({
								title: "删除失败，请重试",
								icon: "none",
							});
						}
					},
					fail: () => {
						if (this.alive)
							uni.showToast({
								title: "操作失败，请重试",
								icon: "none",
							});
					},
					complete: () => {
						if (this.alive) this.actionBusy = false;
					},
				});
			} catch (error) {
				this.actionBusy = false;
				uni.showToast({ title: "操作失败，请重试", icon: "none" });
			}
		},
	},
};
</script>

<style scoped>
.seal-second-line {
	display: block;
}
.category-page {
	min-height: 100vh;
	box-sizing: border-box;
	padding: 38rpx 32rpx 50rpx;
	background: #f8f7f2;
	color: #424a40;
}
.heading {
	position: relative;
	overflow: hidden;
	padding: 38rpx 34rpx;
	border-radius: 22rpx;
	background: #e9eee5;
}
.heading-en,
.heading-title,
.heading-subtitle {
	display: block;
}
.heading-en,
.section-en {
	color: #9faa9a;
	font-size: 17rpx;
	letter-spacing: 3rpx;
}
.heading-title {
	margin-top: 15rpx;
	color: #40503f;
	font-family: serif;
	font-size: 43rpx;
	font-weight: 600;
}
.heading-subtitle {
	margin-top: 12rpx;
	color: #92a08e;
	font-size: 22rpx;
}
.heading-seal {
	position: absolute;
	right: 40rpx;
	top: 42rpx;
	padding: 8rpx 10rpx;
	border: 1rpx solid #b1bdaa;
	color: #9cae98;
	font-family: serif;
	font-size: 22rpx;
	line-height: 1.4;
}
.section-top,
.collection-heading {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	margin-top: 42rpx;
}
.section-en,
.section-name {
	display: block;
}
.section-name {
	margin-top: 8rpx;
	color: #404b3e;
	font-family: serif;
	font-size: 33rpx;
	font-weight: 600;
}
.total {
	color: #a7ad9f;
	font-size: 21rpx;
}
.category-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 18rpx;
	margin-top: 22rpx;
}
.category-tile {
	position: relative;
	overflow: hidden;
	min-height: 136rpx;
	box-sizing: border-box;
	padding: 22rpx 25rpx;
	border: 1rpx solid #eeece4;
	border-radius: 17rpx;
	background: #fffdfa;
}
.category-tile.selected {
	border-color: #9eaf99;
	background: #eef2ea;
}
.tile-number,
.tile-name,
.tile-count {
	position: relative;
	z-index: 1;
	display: block;
}
.tile-number {
	color: #b6c0b1;
	font-size: 18rpx;
}
.tile-name {
	margin-top: 8rpx;
	color: #5c6e57;
	font-family: serif;
	font-size: 28rpx;
	font-weight: 600;
}
.tile-count {
	margin-top: 6rpx;
	color: #aaafa3;
	font-size: 20rpx;
}
.tile-mark {
	position: absolute;
	right: 22rpx;
	bottom: 8rpx;
	color: #e9ede5;
	font-family: serif;
	font-size: 84rpx;
}
.selected .tile-mark {
	color: #dce5d8;
}
.add-button {
	margin: 0;
	padding: 0 20rpx;
	border-radius: 10rpx;
	background: #7f907a;
	color: white;
	font-size: 22rpx;
	line-height: 62rpx;
}
.add-button::after,
.reset-button::after,
.empty-button::after {
	border: 0;
}
.filter-scroll {
	width: 100%;
	margin-top: 22rpx;
	white-space: nowrap;
}
.accessory-filter {
	margin-top: 10rpx;
}
.filter-options {
	display: inline-flex;
	gap: 12rpx;
}
.filter-chip {
	padding: 10rpx 20rpx;
	border: 1rpx solid #e8e9e1;
	border-radius: 30rpx;
	background: #fffdfa;
	color: #92998c;
	font-size: 22rpx;
}
.filter-chip.active {
	border-color: #dce5d8;
	background: #e9eee6;
	color: #657b61;
}
.results-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 24rpx 0 16rpx;
	color: #a7ada1;
	font-size: 22rpx;
}
.reset-button {
	margin: 0;
	padding: 0;
	background: transparent;
	color: #83947f;
	font-size: 22rpx;
	line-height: 1.6;
}
.clothing-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 20rpx;
}
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 70rpx 25rpx;
	border: 1rpx solid #f0eee7;
	border-radius: 20rpx;
	background: #fffdfa;
	text-align: center;
}
.empty-mark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100rpx;
	height: 100rpx;
	margin-bottom: 22rpx;
	border-radius: 50%;
	background: #eff2ea;
	color: #a7b6a0;
	font-family: serif;
	font-size: 48rpx;
}
.empty-title {
	color: #6a7965;
	font-size: 27rpx;
}
.empty-copy {
	margin-top: 14rpx;
	color: #aaa99e;
	font-size: 22rpx;
	line-height: 1.7;
}
.empty-button {
	margin: 25rpx 0 0;
	padding: 0 24rpx;
	border: 1rpx solid #d5ded1;
	border-radius: 30rpx;
	background: transparent;
	color: #82937c;
	font-size: 22rpx;
	line-height: 60rpx;
}
.page-ending {
	padding-top: 44rpx;
	color: #c2c3b9;
	font-size: 20rpx;
	text-align: center;
}
@media screen and (max-width: 340px) {
	.category-page {
		padding-left: 22rpx;
		padding-right: 22rpx;
	}
	.heading-seal {
		right: 24rpx;
	}
	.category-grid,
	.clothing-grid {
		gap: 12rpx;
	}
}
</style>
