<template>
	<view class="form-mask" @click.self="close">
		<view class="form-sheet">
			<view class="sheet-header">
				<view>
					<text class="sheet-eyebrow">{{ dateLabel }}</text>
					<text class="sheet-title">{{
						planned ? "计划这一天" : "记录这一天"
					}}</text>
				</view>
				<button class="close-button" aria-label="关闭" @click="close">
					×
				</button>
			</view>
			<scroll-view class="form-scroll" scroll-y>
				<view v-if="!planned" class="photo-picker" @click="choosePhoto">
					<image
						v-if="form.photo"
						class="preview"
						:src="form.photo"
						mode="aspectFill"
					/>
					<view v-else class="photo-empty">
						<text class="photo-plus">＋</text>
						<text>添加今日穿搭照片</text>
					</view>
					<view class="photo-hint">{{
						choosing
							? "正在保存照片…"
							: form.photo
								? "更换照片"
								: "照片选填"
					}}</view>
				</view>

				<view class="field">
					<text class="field-label"
						>穿了什么<text class="field-note"
							>已选 {{ form.itemIds.length }} 件</text
						></text
					>
					<view v-if="clothes.length" class="options">
						<view
							v-for="option in filterOptions"
							:key="option"
							class="option"
							:class="{ selected: filter === option }"
							@click="filter = option"
							>{{ option }}</view
						>
					</view>
					<view v-if="filteredClothes.length" class="item-grid">
						<view
							v-for="item in filteredClothes"
							:key="item.id"
							class="item-tile"
							:class="{ selected: isSelected(item) }"
							@click="toggleItem(item)"
						>
							<image
								v-if="item.photo"
								class="item-photo"
								:src="item.photo"
								mode="aspectFill"
							/>
							<view v-else class="item-mark">衣</view>
							<text class="item-name">{{ item.name }}</text>
						</view>
					</view>
					<text v-else class="empty-note">{{
						clothes.length
							? "这个品类还没有单品。"
							: "衣橱还是空的，也可以只写下今天的心情。"
					}}</text>
				</view>

				<view class="field">
					<text class="field-label">场合</text>
					<view class="options">
						<view
							v-for="option in occasions"
							:key="option"
							class="option"
							:class="{ selected: form.occasion === option }"
							@click="toggleOccasion(option)"
							>{{ option }}</view
						>
					</view>
				</view>

				<view class="field last-field">
					<text class="field-label">备注</text>
					<textarea
						v-model="form.note"
						class="note-input"
						maxlength="200"
						:show-confirm-bar="false"
						:placeholder="
							planned
								? '想穿去哪里？'
								: '今天穿得舒服吗？有什么想记下的？'
						"
						placeholder-class="placeholder"
					/>
				</view>
			</scroll-view>
			<view class="sheet-footer">
				<button
					class="save-button"
					:disabled="saving || choosing"
					@click="submit"
				>
					{{ saving ? "保存中…" : planned ? "保存计划" : "保存记录" }}
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import { saveOutfitLog } from "@/utils/storage.js";
import { pickPhoto, removePhoto } from "@/utils/photo.js";

export default {
	name: "OutfitLogForm",
	props: {
		date: { type: String, required: true },
		dateLabel: { type: String, required: true },
		planned: { type: Boolean, default: false },
		log: { type: Object, default: null },
		clothes: { type: Array, default: () => [] },
	},
	emits: ["close", "saved"],
	data() {
		const log = this.log || {};
		return {
			filterOptions: ["全部", "上装", "下装", "鞋子", "配饰"],
			occasions: ["通勤", "约会", "聚会", "出行", "居家", "运动"],
			filter: "全部",
			form: {
				itemIds: Array.isArray(log.itemIds) ? [...log.itemIds] : [],
				photo: log.photo || "",
				occasion: log.occasion || "",
				note: log.note || "",
			},
			choosing: false,
			saving: false,
			alive: true,
			pendingPhoto: "",
		};
	},
	computed: {
		filteredClothes() {
			return this.clothes.filter(
				(item) =>
					this.filter === "全部" || item.category === this.filter,
			);
		},
	},
	beforeUnmount() {
		this.alive = false;
		removePhoto(this.pendingPhoto);
	},
	methods: {
		toast(title) {
			uni.showToast({ title, icon: "none" });
		},
		close() {
			if (!this.saving) this.$emit("close");
		},
		isSelected(item) {
			return this.form.itemIds.includes(item.id);
		},
		toggleItem(item) {
			const index = this.form.itemIds.indexOf(item.id);
			if (index === -1) this.form.itemIds.push(item.id);
			else this.form.itemIds.splice(index, 1);
		},
		toggleOccasion(option) {
			this.form.occasion = this.form.occasion === option ? "" : option;
		},
		async choosePhoto() {
			if (this.choosing || this.saving) return;
			this.choosing = true;
			try {
				const path = await pickPhoto();
				if (!path) return;
				if (!this.alive) {
					removePhoto(path);
					return;
				}
				removePhoto(this.pendingPhoto);
				this.pendingPhoto = path;
				this.form.photo = path;
			} catch (error) {
				if (this.alive) this.toast(error.message);
			} finally {
				if (this.alive) this.choosing = false;
			}
		},
		submit() {
			if (this.saving || this.choosing) return;
			const note = this.form.note.trim();
			if (!this.form.itemIds.length && !this.form.photo && !note)
				return this.toast("选一件单品，或写点什么吧");
			this.saving = true;
			try {
				saveOutfitLog({
					date: this.date,
					itemIds: [...this.form.itemIds],
					photo: this.form.photo,
					occasion: this.form.occasion,
					note,
				});
			} catch (error) {
				this.saving = false;
				this.toast("保存失败，请重试");
				return;
			}
			this.pendingPhoto = "";
			this.$emit("saved");
		},
	},
};
</script>

<style scoped>
.form-mask {
	position: fixed;
	z-index: 99;
	inset: 0;
	/* H5 的 tabBar 是页面元素，需让出其高度；其他平台变量缺失时回退为 0。 */
	bottom: var(--window-bottom, 0px);
	display: flex;
	align-items: flex-end;
	background: rgba(46, 49, 42, 0.48);
}
.form-sheet {
	display: flex;
	flex-direction: column;
	width: 100%;
	/* 需为确定高度：只用 max-height 时 scroll-view 撑满内容，无法滚动。 */
	height: 90%;
	overflow: hidden;
	border-radius: 32rpx 32rpx 0 0;
	background: #fcfaf6;
}
.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 32rpx 20rpx;
}
.sheet-eyebrow,
.sheet-title {
	display: block;
}
.sheet-eyebrow {
	color: #a4a597;
	font-size: 21rpx;
}
.sheet-title {
	margin-top: 8rpx;
	color: #3d473d;
	font-family: serif;
	font-size: 36rpx;
	font-weight: 600;
}
.close-button {
	margin: 0;
	padding: 0;
	width: 60rpx;
	height: 60rpx;
	line-height: 60rpx;
	background: #f0eee8;
	color: #777e72;
	border-radius: 50%;
	font-size: 42rpx;
}
.close-button::after,
.save-button::after {
	border: 0;
}
.form-scroll {
	flex: 1;
	min-height: 0;
	box-sizing: border-box;
	padding: 0 32rpx;
}
.photo-picker {
	position: relative;
	height: 220rpx;
	overflow: hidden;
	border: 1rpx dashed #d6d9cd;
	border-radius: 18rpx;
	background: #f0f1ea;
}
.preview,
.photo-empty {
	width: 100%;
	height: 100%;
}
.photo-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: #8f9889;
	font-size: 24rpx;
}
.photo-plus {
	font-size: 54rpx;
	font-weight: 200;
	line-height: 1.2;
}
.photo-hint {
	position: absolute;
	right: 14rpx;
	bottom: 14rpx;
	padding: 7rpx 14rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.86);
	color: #818a7d;
	font-size: 20rpx;
}
.field {
	margin-top: 26rpx;
}
.last-field {
	margin-bottom: 32rpx;
}
.field-label {
	display: block;
	color: #4a5147;
	font-size: 25rpx;
	font-weight: 600;
}
.field-note {
	margin-left: 8rpx;
	color: #aaa99f;
	font-size: 20rpx;
	font-weight: 400;
}
.options {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 14rpx;
}
.option {
	padding: 11rpx 22rpx;
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
.item-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14rpx;
	margin-top: 16rpx;
}
.item-tile {
	box-sizing: border-box;
	min-width: 0;
	padding: 8rpx;
	border: 2rpx solid #eeece4;
	border-radius: 14rpx;
	background: #fff;
}
.item-tile.selected {
	border-color: #7d8f78;
	background: #eef2ea;
}
.item-photo,
.item-mark {
	display: block;
	width: 100%;
	height: 120rpx;
	border-radius: 10rpx;
}
.item-mark {
	background: #efece4;
	color: #b9b4a6;
	font-family: serif;
	font-size: 38rpx;
	line-height: 120rpx;
	text-align: center;
}
.item-name {
	display: block;
	margin-top: 8rpx;
	overflow: hidden;
	color: #5c6658;
	font-size: 21rpx;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.empty-note {
	display: block;
	margin-top: 14rpx;
	color: #a7aa9e;
	font-size: 22rpx;
}
.note-input {
	box-sizing: border-box;
	width: 100%;
	height: 150rpx;
	margin-top: 14rpx;
	padding: 18rpx 20rpx;
	border: 1rpx solid #e7e8df;
	border-radius: 12rpx;
	background: #fff;
	color: #41483e;
	font-size: 25rpx;
}
.placeholder {
	color: #bbbcb3;
}
.sheet-footer {
	padding: 20rpx 32rpx;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	background: #fcfaf6;
	box-shadow: 0 -5rpx 20rpx rgba(80, 80, 60, 0.04);
}
.save-button {
	margin: 0;
	border-radius: 12rpx;
	background: #7d8f78;
	color: white;
	font-size: 27rpx;
	line-height: 80rpx;
}
</style>
