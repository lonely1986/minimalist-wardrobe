<template>
	<view class="form-mask" @click.self="close">
		<view class="form-sheet">
			<view class="sheet-header"
				><view
					><text class="sheet-eyebrow">A LITTLE COLLECTION</text
					><text class="sheet-title">{{
						item ? "编辑衣物" : "添一件新衣"
					}}</text></view
				><button class="close-button" aria-label="关闭" @click="close">
					×
				</button></view
			>
			<scroll-view class="form-scroll" scroll-y>
				<view class="photo-picker" @click="choosePhoto">
					<image
						v-if="form.photo"
						class="preview"
						:src="form.photo"
						mode="aspectFill"
					/>
					<view v-else class="photo-empty"
						><text class="photo-plus">＋</text
						><text>添加衣物照片</text></view
					>
					<view class="photo-hint">{{
						choosing
							? "正在保存照片…"
							: form.photo
								? "更换照片"
								: "照片选填"
					}}</view>
				</view>
				<view class="field"
					><text class="field-label"
						>衣物名称 <text class="required">*</text></text
					><input
						v-model="form.name"
						class="text-input"
						maxlength="40"
						placeholder="给这件衣物起个名字"
						placeholder-class="placeholder"
				/></view>
				<view class="field"
					><text class="field-label"
						>所属品类 <text class="required">*</text></text
					><view class="options"
						><view
							v-for="option in categories"
							:key="option"
							class="option"
							:class="{ selected: form.category === option }"
							@click="setCategory(option)"
							>{{ option }}</view
						></view
					></view
				>
				<view v-if="form.category === '配饰'" class="field"
					><text class="field-label"
						>配饰类别 <text class="required">*</text></text
					><view class="options"
						><view
							v-for="option in accessoryTypes"
							:key="option"
							class="option"
							:class="{ selected: form.accessoryType === option }"
							@click="form.accessoryType = option"
							>{{ option }}</view
						></view
					></view
				>
				<view class="field"
					><text class="field-label"
						>适穿季节 <text class="required">*</text
						><text class="field-note">可多选</text></text
					><view class="options"
						><view
							v-for="option in seasons"
							:key="option"
							class="option"
							:class="{ selected: form.seasons.includes(option) }"
							@click="toggleOption('seasons', option)"
							>{{ option }}</view
						></view
					></view
				>
				<view class="field"
					><text class="field-label">颜色</text
					><input
						v-model="form.color"
						class="text-input"
						maxlength="20"
						placeholder="如：月白、黛青"
						placeholder-class="placeholder"
				/></view>
				<view class="field"
					><text class="field-label"
						>购买价格<text class="field-note"
							>选填，用于计算单次成本</text
						></text
					><input
						v-model="form.price"
						class="text-input"
						type="digit"
						maxlength="10"
						placeholder="单位：元"
						placeholder-class="placeholder"
				/></view>
				<view class="field"
					><text class="field-label"
						>风格 <text class="field-note">可多选</text></text
					><view class="options"
						><view
							v-for="option in styles"
							:key="option"
							class="option"
							:class="{ selected: form.styles.includes(option) }"
							@click="toggleOption('styles', option)"
							>{{ option }}</view
						></view
					></view
				>
				<view class="field"
					><text class="field-label">厚薄</text
					><view class="options"
						><view
							v-for="option in thicknesses"
							:key="option"
							class="option"
							:class="{ selected: form.thickness === option }"
							@click="form.thickness = option"
							>{{ option }}</view
						></view
					></view
				>
				<view class="field favorite-row"
					><view
						><text class="field-label">标记常穿</text
						><text class="favorite-note"
							>把偏爱的衣物留在心上</text
						></view
					><switch
						:checked="form.favorite"
						color="#82917c"
						@change="form.favorite = $event.detail.value"
				/></view>
			</scroll-view>
			<view class="sheet-footer"
				><button
					class="save-button primary-button"
					:disabled="saving || choosing"
					@click="submit"
				>
					{{ saving ? "保存中…" : "保存衣物" }}
				</button></view
			>
		</view>
	</view>
</template>

<script>
import { saveClothing } from "@/utils/storage.js";
import { pickPhoto, removePhoto } from "@/utils/photo.js";

const categories = ["上装", "下装", "鞋子", "配饰"];
const accessoryTypes = ["围巾", "帽子", "首饰", "包包"];
const seasons = ["春", "夏", "秋", "冬"];

export default {
	name: "ClothingForm",
	props: { item: { type: Object, default: null } },
	emits: ["close", "saved"],
	data() {
		const item = this.item || {};
		return {
			categories,
			accessoryTypes,
			seasons,
			styles: ["简约", "通勤", "休闲", "复古", "中式", "优雅"],
			thicknesses: ["轻薄", "适中", "厚实"],
			form: {
				name: item.name || "",
				photo: item.photo || "",
				seasons: Array.isArray(item.seasons)
					? [
							...new Set(
								item.seasons.map((value) =>
									value.endsWith("季")
										? value.slice(0, -1)
										: value,
								),
							),
						]
					: [],
				category: item.category || "",
				accessoryType: item.accessoryType || "",
				color: item.color || "",
				styles: Array.isArray(item.styles) ? [...item.styles] : [],
				thickness: item.thickness || "适中",
				favorite: !!item.favorite,
				price: typeof item.price === "number" ? String(item.price) : "",
			},
			choosing: false,
			saving: false,
			alive: true,
			pendingPhoto: "",
		};
	},
	beforeUnmount() {
		this.alive = false;
		this.discardPendingPhoto();
	},
	methods: {
		toast(title) {
			uni.showToast({ title, icon: "none" });
		},
		discardPendingPhoto() {
			removePhoto(this.pendingPhoto);
			this.pendingPhoto = "";
		},
		close() {
			if (!this.saving) this.$emit("close");
		},
		setCategory(value) {
			this.form.category = value;
			if (value !== "配饰") this.form.accessoryType = "";
		},
		toggleOption(key, value) {
			const values = this.form[key];
			const index = values.indexOf(value);
			if (index === -1) values.push(value);
			else values.splice(index, 1);
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
				this.discardPendingPhoto();
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
			const name = this.form.name.trim();
			if (!name) return this.toast("请填写衣物名称");
			if (!categories.includes(this.form.category))
				return this.toast("请选择衣物品类");
			if (
				this.form.category === "配饰" &&
				!accessoryTypes.includes(this.form.accessoryType)
			)
				return this.toast("请选择配饰类别");
			if (
				!this.form.seasons.length ||
				this.form.seasons.some((value) => !seasons.includes(value))
			)
				return this.toast("请选择适穿季节");
			const priceText = String(this.form.price).trim();
			const price = priceText === "" ? null : Number(priceText);
			if (price !== null && (!Number.isFinite(price) || price < 0))
				return this.toast("请填写有效的价格");
			this.saving = true;
			const now = new Date().toISOString();
			const record = {
				...(this.item || {}),
				...this.form,
				name,
				color: this.form.color.trim(),
				price,
				seasons: [...this.form.seasons],
				styles: [...this.form.styles],
				id:
					this.item && this.item.id != null
						? this.item.id
						: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
				createdAt:
					this.item && this.item.createdAt != null
						? this.item.createdAt
						: now,
				updatedAt: now,
			};
			try {
				if (saveClothing(record) === false)
					throw new Error("save failed");
			} catch (error) {
				this.saving = false;
				this.toast("保存失败，请重试");
				return;
			}
			this.pendingPhoto = "";
			this.$emit("saved", record);
			try {
				uni.$emit("clothes-changed");
			} catch (error) {
				/* 页面将在 onShow 时刷新 */
			}
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
	font-size: 18rpx;
	letter-spacing: 3rpx;
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
	border: 1rpx dashed #c9cfc1;
	border-radius: 18rpx;
	background: #f0f1eb;
}
.preview {
	width: 100%;
	height: 100%;
	display: block;
}
.photo-empty {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: #8c9887;
	font-size: 24rpx;
}
.photo-plus {
	font-size: 55rpx;
	font-weight: 300;
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
.field-label {
	display: block;
	color: #4a5147;
	font-size: 25rpx;
	font-weight: 600;
}
.required {
	color: #b97b72;
}
.field-note {
	margin-left: 8rpx;
	color: #aaa99f;
	font-size: 20rpx;
	font-weight: 400;
}
.text-input {
	box-sizing: border-box;
	height: 76rpx;
	margin-top: 14rpx;
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
.favorite-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: 32rpx;
}
.favorite-note {
	display: block;
	margin-top: 6rpx;
	color: #aaa99f;
	font-size: 21rpx;
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
.save-button[disabled] {
	opacity: 0.6;
}
</style>
