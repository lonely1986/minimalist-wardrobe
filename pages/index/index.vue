<template>
	<view class="wardrobe-page page-shell">
		<view class="top-decoration"
			><text>衣 伴</text><text class="decoration-line"></text
			><text>YI BAN</text></view
		>
		<view class="hero page-header"
			><view class="hero-copy"
				><text class="hero-kicker eyebrow">YOUR PERSONAL WARDROBE</text
				><view class="hero-title page-title"
					><text>衣物有序，</text
					><text class="hero-second-line">日子从容。</text></view
				><text class="hero-subtitle page-subtitle"
					>收纳四季衣裳，珍藏每一份喜欢。</text
				></view
			><view class="hero-seal"><text>衣</text><text>伴</text></view></view
		>
		<view class="overview"
			><view
				><text class="overview-number">{{ clothes.length }}</text
				><text class="overview-label">件衣物</text></view
			><view class="overview-divider"></view
			><view
				><text class="overview-number">{{ favoriteCount }}</text
				><text class="overview-label">件常穿</text></view
			><button class="add-button primary-button" @click="openForm()">
				<text class="add-symbol">＋</text> 添置衣物
			</button></view
		>
		<view class="batch-row" @click="goImport"
			><text>有很多衣服要录入？试试拍照批量添加</text
			><text class="batch-arrow">›</text></view
		>
		<view class="content-heading"
			><view
				><text class="section-overline">THE COLLECTION</text
				><text class="section-heading section-title"
					>我的衣物库</text
				></view
			><button class="category-link" @click="goCategory">
				分类查看 <text>›</text>
			</button></view
		>
		<view class="filter-panel">
			<view class="filter-row"
				><text class="filter-label">季节</text
				><scroll-view
					class="filter-scroll"
					scroll-x
					:show-scrollbar="false"
					><view class="filter-options"
						><view
							v-for="option in seasonOptions"
							:key="option"
							class="filter-chip"
							:class="{ active: selectedSeason === option }"
							@click="selectedSeason = option"
							>{{ option }}</view
						></view
					></scroll-view
				></view
			>
			<view class="filter-row"
				><text class="filter-label">品类</text
				><scroll-view
					class="filter-scroll"
					scroll-x
					:show-scrollbar="false"
					><view class="filter-options"
						><view
							v-for="option in categoryOptions"
							:key="option"
							class="filter-chip"
							:class="{ active: selectedCategory === option }"
							@click="selectedCategory = option"
							>{{ option }}</view
						></view
					></scroll-view
				></view
			>
		</view>
		<view class="results-heading"
			><text>{{
				selectedSeason === "全部" && selectedCategory === "全部"
					? "全部衣物"
					: "筛选结果"
			}}</text
			><text class="results-count"
				>{{ filteredClothes.length }} 件</text
			></view
		>
		<view v-if="loadError" class="empty-state empty"
			><text class="empty-title">衣物库暂时无法打开</text
			><text class="empty-copy">请稍后重试，不会影响已保存的衣物。</text
			><button class="empty-button" @click="refresh">
				重新加载
			</button></view
		>
		<view v-else-if="!filteredClothes.length" class="empty-state empty"
			><view class="empty-mark">衣</view
			><text class="empty-title">{{
				clothes.length ? "没有找到合适的衣物" : "衣橱还空着呢"
			}}</text
			><text class="empty-copy">{{
				clothes.length
					? "换个季节或品类，看看其他心仪之物。"
					: "从记录第一件衣物开始，慢慢整理你的四季。"
			}}</text
			><button
				v-if="!clothes.length"
				class="empty-button"
				@click="openForm()"
			>
				＋ 添加第一件衣物</button
			><button v-else class="empty-button" @click="resetFilters">
				清除筛选
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
		<view class="page-ending"
			>— &nbsp; 把平凡日子，穿成喜欢的模样 &nbsp; —</view
		>
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
			seasonOptions: ["全部", "春", "夏", "秋", "冬"],
			categoryOptions: ["全部", "上装", "下装", "鞋子", "配饰"],
			selectedSeason: "全部",
			selectedCategory: "全部",
			formOpen: false,
			editingItem: null,
			loadError: false,
			actionBusy: false,
			alive: true,
		};
	},
	computed: {
		favoriteCount() {
			return this.clothes.filter((item) => item.favorite).length;
		},
		filteredClothes() {
			return this.clothes.filter(
				(item) =>
					(this.selectedSeason === "全部" ||
						(Array.isArray(item.seasons) &&
							(item.seasons.includes(this.selectedSeason) ||
								item.seasons.includes(
									this.selectedSeason + "季",
								)))) &&
					(this.selectedCategory === "全部" ||
						item.category === this.selectedCategory),
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
		resetFilters() {
			this.selectedSeason = "全部";
			this.selectedCategory = "全部";
		},
		goImport() {
			uni.navigateTo({ url: "/pages/import/index" });
		},
		goCategory() {
			uni.switchTab({
				url: "/pages/category/index",
				fail: () => {
					if (this.alive)
						uni.showToast({
							title: "分类页面暂不可用",
							icon: "none",
						});
				},
			});
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
.wardrobe-page {
	min-height: 100vh;
	box-sizing: border-box;
	padding: 38rpx 32rpx 50rpx;
	background: #f8f7f2;
	color: #424a40;
}
.top-decoration {
	display: flex;
	align-items: center;
	gap: 12rpx;
	color: #8a9484;
	font-size: 19rpx;
	letter-spacing: 3rpx;
}
.decoration-line {
	width: 42rpx;
	height: 1rpx;
	background: #adb7a7;
}
.hero-second-line {
	display: block;
}
.hero {
	position: relative;
	display: flex;
	justify-content: space-between;
	align-items: center;
	overflow: hidden;
	margin-top: 30rpx;
	padding: 42rpx 36rpx;
	border-radius: 22rpx;
	background: #e8ede3;
}
.hero::after {
	content: "";
	position: absolute;
	right: -60rpx;
	bottom: -130rpx;
	width: 300rpx;
	height: 300rpx;
	border: 1rpx solid rgba(126, 149, 120, 0.2);
	border-radius: 50%;
}
.hero-copy {
	position: relative;
	z-index: 1;
}
.hero-kicker,
.hero-title,
.hero-subtitle {
	display: block;
}
.hero-kicker {
	color: #9aa998;
	font-size: 17rpx;
	letter-spacing: 3rpx;
}
.hero-title {
	margin-top: 20rpx;
	color: #40503f;
	font-family: serif;
	font-size: 45rpx;
	font-weight: 600;
	line-height: 1.45;
	letter-spacing: 3rpx;
}
.hero-subtitle {
	margin-top: 17rpx;
	color: #8d9b8a;
	font-size: 22rpx;
}
.hero-seal {
	display: flex;
	flex-direction: column;
	padding: 9rpx 10rpx;
	border: 1rpx solid #aebba9;
	color: #9aa998;
	font-family: serif;
	font-size: 22rpx;
	line-height: 1.4;
}
.overview {
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 28rpx 6rpx 35rpx;
}
.overview-number {
	color: #5e6f5c;
	font-family: serif;
	font-size: 36rpx;
}
.overview-label {
	margin-left: 7rpx;
	color: #a4a79a;
	font-size: 21rpx;
}
.overview-divider {
	height: 38rpx;
	width: 1rpx;
	background: #e0e2d9;
}
.add-button {
	margin: 0 0 0 auto;
	padding: 0 22rpx;
	border-radius: 10rpx;
	background: #7f907a;
	color: #fff;
	font-size: 23rpx;
	line-height: 68rpx;
	white-space: nowrap;
}
.batch-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 20rpx 0 36rpx;
	padding: 18rpx 24rpx;
	border-radius: 12rpx;
	background: #f0f2eb;
	color: #6e7d69;
	font-size: 23rpx;
}
.batch-arrow {
	color: #a5ae9f;
	font-size: 32rpx;
	line-height: 1;
}
.add-symbol {
	font-size: 28rpx;
}
.add-button::after,
.category-link::after,
.empty-button::after {
	border: 0;
}
.content-heading {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
}
.section-overline,
.section-heading {
	display: block;
}
.section-overline {
	color: #abb2a3;
	font-size: 17rpx;
	letter-spacing: 3rpx;
}
.section-heading {
	margin-top: 9rpx;
	color: #404b3e;
	font-family: serif;
	font-size: 34rpx;
	font-weight: 600;
}
.category-link {
	margin: 0;
	padding: 0;
	background: transparent;
	color: #8c9a88;
	font-size: 23rpx;
	line-height: 1.8;
}
.category-link text {
	font-size: 32rpx;
}
.filter-panel {
	margin-top: 26rpx;
	padding: 18rpx 20rpx;
	border: 1rpx solid #efeee8;
	border-radius: 16rpx;
	background: #fffdfa;
}
.filter-row {
	display: flex;
	align-items: center;
	min-width: 0;
}
.filter-row + .filter-row {
	margin-top: 10rpx;
}
.filter-label {
	flex-shrink: 0;
	width: 68rpx;
	color: #aaa99d;
	font-size: 22rpx;
}
.filter-scroll {
	min-width: 0;
	flex: 1;
	white-space: nowrap;
}
.filter-options {
	display: inline-flex;
	gap: 8rpx;
}
.filter-chip {
	padding: 9rpx 18rpx;
	border-radius: 30rpx;
	color: #858b7f;
	font-size: 22rpx;
}
.filter-chip.active {
	background: #e9eee6;
	color: #657b61;
}
.results-heading {
	display: flex;
	justify-content: space-between;
	margin: 30rpx 0 18rpx;
	color: #717a6e;
	font-size: 23rpx;
}
.results-count {
	color: #b0b3a8;
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
	.wardrobe-page {
		padding-left: 22rpx;
		padding-right: 22rpx;
	}
	.hero-title {
		font-size: 39rpx;
	}
	.overview {
		gap: 12rpx;
	}
	.clothing-grid {
		gap: 12rpx;
	}
}
</style>
