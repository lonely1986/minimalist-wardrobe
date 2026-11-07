import { RECOGNIZE_URL } from "./config.js";
// #ifdef H5
import { scaledJpeg } from "./photo.js";
// #endif

const REQUEST_TIMEOUT_MS = 40000;
const MAX_IMAGE_SIDE = 1024;

export function recognizeEnabled() {
	return !!RECOGNIZE_URL;
}

// #ifdef H5
// 缩小后再上传，节省流量和识别费用；小程序端已由 chooseImage 压缩。
async function readImage(path) {
	const dataUrl = await scaledJpeg(path, MAX_IMAGE_SIDE, 0.8);
	return { image: dataUrl.split(",")[1], mimeType: "image/jpeg" };
}
// #endif

// #ifndef H5
function readImage(path) {
	return new Promise((resolve, reject) => {
		uni.getFileSystemManager().readFile({
			filePath: path,
			encoding: "base64",
			success: (result) =>
				resolve({
					image: result.data,
					mimeType: /\.png$/i.test(path) ? "image/png" : "image/jpeg",
				}),
			fail: reject,
		});
	});
}
// #endif

function postImage(payload) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: RECOGNIZE_URL,
			method: "POST",
			header: { "Content-Type": "application/json" },
			data: payload,
			timeout: REQUEST_TIMEOUT_MS,
			success(response) {
				const data = response.data || {};
				if (response.statusCode === 200 && data.result)
					resolve(data.result);
				else reject(new Error(data.error || "识别失败，请重试"));
			},
			fail() {
				reject(new Error("网络异常，请重试"));
			},
		});
	});
}

/**
 * @param {string} path 本地图片路径
 * @returns {Promise<Partial<import('../types').Clothing>>} 失败时抛出可展示的错误
 */
export async function recognizeClothing(path) {
	let payload;
	try {
		payload = await readImage(path);
	} catch (error) {
		throw new Error("照片读取失败");
	}
	return postImage(payload);
}
