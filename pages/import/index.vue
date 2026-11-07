<template>
	<view class="import-page page-shell">
		<view class="hero">
			<text class="eyebrow">ADD IN A BATCH</text>
			<text class="hero-title">一次添加多件衣物</text>
			<text class="hero-subtitle">{{
				enabled
					? "选几张照片，自动认出名称、品类和颜色，核对后再保存。"
					: "识别服务还没有配置，选好照片后手动填写即可。"
			}}</text>
			<button class="pick-button" @click="pickPhotos">
				＋ 选择照片（{{ drafts.length }}/{{ maxDrafts }}）
			</button>
		</view>

		<view
			v-for="(draft, index) in drafts"
			:key="draft.key"
			class="draft-card"
			:class="{ invalid: draft.invalid }"
		>
			<view class="draft-top">
				<image class="draft-photo" :src="draft.path" mode="aspectFill" />
				<view class="draft-summary">
					<text class="draft-index">第 {{ index + 1 }} 件</text>
					<text class="draft-status" :class="draft.status">{{
						statusText(draft)
					}}</text>
					<button
						v-if="draft.status === 'failed'"
						class="retry-button"
						@click="retry(draft)"
					>
						重新识别
					</button>
				</view>
				<button
					class="remove-button"
					aria-label="移除"
					@click="remove(draft)"
				>
					×
				</button>
			</view>

			<view v-if="draft.status !== 'loading'" class="draft-fields">
				<text class="field-label">名称</text>
				<input
					v-model="draft.form.name"
					class="text-input"
					maxlength="20"
					placeholder="如：米色呢大衣"
					placeholder-class="placeholder"
				/>
				<text class="field-label">品类</text>
				<view class="options">
					<view
						v-for="option in categories"
						:key="option"
						class="option"
						:class="{ selected: draft.form.category === option }"
						@click="setCategory(draft, option)"
						>{{ option }}</view
					>
				</view>
				<block v-if="draft.form.category === '配饰'">
					<text class="field-label">配饰类别</text>
					<view class="options">
						<view
							v-for="option in accessoryTypes"
							:key="option"
							class="option"
							:class="{
								selected: draft.form.accessoryType === option,
							}"
							@click="draft.form.accessoryType = option"
							>{{ option }}</view
						>
					</view>
				</block>
				<text class="field-label">颜色</text>
				<input
					v-model="draft.form.color"
					class="text-input"
					maxlength="10"
					placeholder="如：米色"
					placeholder-class="placeholder"
				/>
				<text class="field-label">适穿季节</text>
				<view class="options">
					<view
						v-for="option in seasons"
						:key="option"
						class="option"
						:class="{ selected: draft.form.seasons.includes(option) }"
						@click="toggleSeason(draft, option)"
						>{{ option }}</view
					>
				</view>
				<text class="field-label">厚薄</text>
				<view class="options">
					<view
						v-for="option in thicknesses"
						:key="option"
						class="option"
						:class="{ selected: draft.form.thickness === option }"
						@click="draft.form.thickness = option"
						>{{ option }}</view
					>
				</view>
			</view>
		</view>

		<view v-if="drafts.length" class="save-bar">
			<text class="save-note">识别结果可能有误，保存前请核对。</text>
			<button class="save-button" :disabled="!canSave" @click="saveAll">
				{{ saveLabel }}
			</button>
		</view>
	</view>
</template>

<script>
import { saveClothing } from "@/utils/storage.js";
import { saveTempPhoto } from "@/utils/photo.js";
import { recognizeClothing, recognizeEnabled } from "@/utils/recognize.js";

const MAX_DRAFTS = 30;
const PICK_LIMIT = 9;
const CONCURRENCY = 2;
let draftSequence = 0;

export default {
	data() {
		return {
			enabled: recognizeEnabled(),
			maxDrafts: MAX_DRAFTS,
			categories: ["上装", "下装", "鞋子", "配饰"],
			accessoryTypes: ["围巾", "帽子", "首饰", "包包"],
			seasons: ["春", "夏", "秋", "冬"],
			thicknesses: ["轻薄", "适中", "厚实"],
			drafts: [],
			saving: false,
			consented: false,
			running: 0,
			alive: true,
		};
	},
	computed: {
		busy() {
			return this.drafts.some((draft) =>
				["queued", "loading"].includes(draft.status),
			);
		},
		canSave() {
			return this.drafts.length > 0 && !this.busy && !this.saving;
		},
		saveLabel() {
			if (this.saving) return "保存中…";
			if (this.busy) return "正在识别…";
			return `保存 ${this.drafts.length} 件衣物`;
		},
	},
	onUnload() {
		this.alive = false;
	},
	methods: {
		toast(title) {
			uni.showToast({ title, icon: "none" });
		},
		statusText(draft) {
			if (draft.status === "queued") return "等待识别…";
			if (draft.status === "loading") return "正在识别…";
			if (draft.status === "done") return "已识别，请核对";
			if (draft.status === "failed") return draft.error;
			return "请手动填写";
		},
		pickPhotos() {
			const room = MAX_DRAFTS - this.drafts.length;
			if (room <= 0) return this.toast(`一次最多添加 ${MAX_DRAFTS} 件`);
			uni.chooseImage({
				count: Math.min(PICK_LIMIT, room),
				sizeType: ["compressed"],
				sourceType: ["album", "camera"],
				success: (result) => {
					if (!this.alive) return;
					const paths = (result.tempFilePaths || []).slice(0, room);
					if (paths.length) this.addDrafts(paths);
				},
				fail: (error) => {
					if (!error || !/cancel/i.test(error.errMsg || ""))
						this.toast("选择照片失败，请重试");
				},
			});
		},
		async addDrafts(paths) {
			const allowed = this.enabled && (await this.askConsent());
			if (!this.alive) return;
			paths.forEach((path) => {
				this.drafts.push({
					key: ++draftSequence,
					path,
					status: allowed ? "queued" : "manual",
					error: "",
					invalid: false,
					form: {
						name: "",
						category: "",
						accessoryType: "",
						color: "",
						seasons: [],
						styles: [],
						thickness: "适中",
					},
				});
			});
			this.pump();
		},
		// 照片要离开设备，每次进入页面首次识别前都说明一次。
		askConsent() {
			if (this.consented) return Promise.resolve(true);
			return new Promise((resolve) => {
				uni.showModal({
					title: "照片将用于识别",
					content:
						"照片会发送到识别服务，由第三方模型判断品类和颜色。服务不保存照片。不同意的话可以手动填写。",
					confirmText: "同意识别",
					cancelText: "手动填写",
					confirmColor: "#82917c",
					success: (result) => {
						this.consented = !!result.confirm;
						resolve(this.consented);
					},
					fail: () => resolve(false),
				});
			});
		},
		pump() {
			while (this.running < CONCURRENCY) {
				const draft = this.drafts.find(
					(item) => item.status === "queued",
				);
				if (!draft) return;
				this.recognize(draft);
			}
		},
		async recognize(draft) {
			draft.status = "loading";
			this.running += 1;
			try {
				const result = await recognizeClothing(draft.path);
				if (!this.alive) return;
				draft.form = { ...draft.form, ...result };
				draft.status = "done";
			} catch (error) {
				if (!this.alive) return;
				draft.status = "failed";
				draft.error = error.message || "识别失败";
			} finally {
				this.running -= 1;
				if (this.alive) this.pump();
			}
		},
		retry(draft) {
			draft.status = "queued";
			draft.error = "";
			this.pump();
		},
		remove(draft) {
			this.drafts = this.drafts.filter((item) => item !== draft);
		},
		setCategory(draft, option) {
			draft.form.category = option;
			draft.invalid = false;
			if (option !== "配饰") draft.form.accessoryType = "";
		},
		toggleSeason(draft, option) {
			const values = draft.form.seasons;
			const index = values.indexOf(option);
			if (index === -1) values.push(option);
			else values.splice(index, 1);
		},
		missingField(form) {
			if (!form.name.trim()) return "名称";
			if (!this.categories.includes(form.category)) return "品类";
			if (form.category === "配饰" && !form.accessoryType)
				return "配饰类别";
			if (!form.seasons.length) return "适穿季节";
			return "";
		},
		validate() {
			let firstProblem = "";
			this.drafts.forEach((draft, index) => {
				const missing = this.missingField(draft.form);
				draft.invalid = !!missing;
				if (missing && !firstProblem)
					firstProblem = `第 ${index + 1} 件还缺${missing}`;
			});
			return firstProblem;
		},
		async saveAll() {
			if (!this.canSave) return;
			const problem = this.validate();
			if (problem) return this.toast(problem);
			this.saving = true;
			let saved = 0;
			// 逐件保存，失败时已保存的不重复，留下的可以再试。
			for (const draft of [...this.drafts]) {
				try {
					const photo = await saveTempPhoto(draft.path);
					saveClothing({
						...draft.form,
						name: draft.form.name.trim(),
						color: draft.form.color.trim(),
						photo,
					});
					this.remove(draft);
					saved += 1;
				} catch (error) {
					break;
				}
			}
			if (!this.alive) return;
			this.saving = false;
			if (saved) uni.$emit("clothes-changed");
			if (this.drafts.length) {
				this.toast(`已保存 ${saved} 件，其余保存失败，请重试`);
				return;
			}
			uni.showToast({ title: `已保存 ${saved} 件`, icon: "success" });
			setTimeout(() => {
				// 用 switchTab 而不是返回：直接打开本页时没有上一页。
				if (this.alive) uni.switchTab({ url: "/pages/index/index" });
			}, 700);
		},
	},
};
</script>

<style scoped>
.import-page {
	min-height: 100vh;
	padding: 32rpx 32rpx 240rpx;
	background: #f8f7f2;
}
.hero {
	padding: 38rpx 36rpx 34rpx;
	border-radius: 22rpx;
	background: #e9eee5;
}
.eyebrow,
.hero-title,
.hero-subtitle,
.draft-index,
.draft-status,
.field-label,
.save-note {
	display: block;
}
.eyebrow {
	color: #a0ad9b;
	font-size: 17rpx;
	letter-spacing: 3rpx;
}
.hero-title {
	margin-top: 18rpx;
	color: #40503f;
	font-family: serif;
	font-size: 38rpx;
	font-weight: 600;
}
.hero-subtitle {
	margin-top: 14rpx;
	color: #8b9986;
	font-size: 23rpx;
	line-height: 1.6;
}
.pick-button,
.save-button {
	margin: 24rpx 0 0;
	border-radius: 12rpx;
	background: #7d8f78;
	color: #fff;
	font-size: 26rpx;
	line-height: 78rpx;
}
.pick-button::after,
.save-button::after,
.retry-button::after,
.remove-button::after {
	border: 0;
}
.draft-card {
	margin-top: 24rpx;
	padding: 24rpx;
	border: 2rpx solid #eeece4;
	border-radius: 18rpx;
	background: #fffdfa;
}
.draft-card.invalid {
	border-color: #d2a79e;
}
.draft-top {
	display: flex;
	align-items: center;
	gap: 20rpx;
}
.draft-photo {
	flex-shrink: 0;
	width: 136rpx;
	height: 136rpx;
	border-radius: 12rpx;
	background: #efece4;
}
.draft-summary {
	flex: 1;
	min-width: 0;
}
.draft-index {
	color: #404b3e;
	font-family: serif;
	font-size: 28rpx;
	font-weight: 600;
}
.draft-status {
	margin-top: 8rpx;
	color: #a7aa9e;
	font-size: 22rpx;
}
.draft-status.done {
	color: #6e836b;
}
.draft-status.failed {
	color: #aa7c72;
}
.retry-button {
	display: inline-block;
	margin: 8rpx 0 0;
	padding: 0;
	background: transparent;
	color: #6e836b;
	font-size: 22rpx;
	line-height: 1.6;
}
.remove-button {
	flex-shrink: 0;
	margin: 0;
	padding: 0;
	width: 52rpx;
	height: 52rpx;
	border-radius: 50%;
	background: #f0eee8;
	color: #777e72;
	font-size: 36rpx;
	line-height: 52rpx;
}
.draft-fields {
	margin-top: 8rpx;
}
.field-label {
	margin-top: 22rpx;
	color: #4a5147;
	font-size: 24rpx;
	font-weight: 600;
}
.text-input {
	box-sizing: border-box;
	height: 72rpx;
	margin-top: 12rpx;
	padding: 0 20rpx;
	border: 1rpx solid #e7e8df;
	border-radius: 12rpx;
	background: #fff;
	color: #41483e;
	font-size: 25rpx;
}
.placeholder {
	color: #bbbcb3;
}
.options {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 12rpx;
}
.option {
	padding: 10rpx 22rpx;
	border: 1rpx solid #e6e8df;
	border-radius: 30rpx;
	background: #fff;
	color: #858b7f;
	font-size: 23rpx;
}
.option.selected {
	border-color: #9bab97;
	background: #e8eee5;
	color: #61745f;
}
.save-bar {
	position: fixed;
	z-index: 10;
	right: 0;
	bottom: 0;
	left: 0;
	padding: 18rpx 32rpx;
	padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
	background: #fcfaf6;
	box-shadow: 0 -5rpx 20rpx rgba(80, 80, 60, 0.06);
}
.save-note {
	color: #a7aa9e;
	font-size: 21rpx;
	text-align: center;
}
.save-button {
	margin-top: 12rpx;
}
</style>
