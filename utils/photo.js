// #ifdef H5
/** 缩小图片并转成 JPEG，返回 data URL。 */
export async function scaledJpeg(path, maxSide, quality) {
	const bitmap = await createImageBitmap(await (await fetch(path)).blob());
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL("image/jpeg", quality);
}

/** H5 没有 saveFile，缩小后以 data URL 存入本地存储，因此容量有限。 */
export async function saveTempPhoto(path) {
	try {
		return await scaledJpeg(path, 480, 0.7);
	} catch (error) {
		throw new Error("照片保存失败，请重试");
	}
}
// #endif

// #ifndef H5
/** 把临时文件存为持久文件，返回新路径。 */
export function saveTempPhoto(path) {
	return new Promise((resolve, reject) => {
		uni.saveFile({
			tempFilePath: path,
			success(saved) {
				if (saved.savedFilePath) resolve(saved.savedFilePath);
				else reject(new Error("照片保存失败，请重试"));
			},
			fail() {
				reject(new Error("照片保存失败，请重试"));
			},
		});
	});
}
// #endif

/** 选择照片并持久保存；用户取消时返回 null，失败时抛出可展示的错误。 */
export function pickPhoto() {
	return new Promise((resolve, reject) => {
		uni.chooseImage({
			count: 1,
			sizeType: ["compressed"],
			sourceType: ["album", "camera"],
			success(result) {
				const path = result.tempFilePaths && result.tempFilePaths[0];
				if (!path) reject(new Error("未获取到照片"));
				else saveTempPhoto(path).then(resolve, reject);
			},
			fail(error) {
				if (error && /cancel/i.test(error.errMsg || "")) resolve(null);
				else reject(new Error("选择照片失败，请重试"));
			},
		});
	});
}

export function removePhoto(path) {
	try {
		if (path && typeof uni.removeSavedFile === "function")
			uni.removeSavedFile({ filePath: path, fail() {} });
	} catch (error) {
		/* 清理失败不影响记录 */
	}
}
