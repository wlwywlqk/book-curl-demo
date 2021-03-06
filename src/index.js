import "./styles.css";
const IMG_PAGE = 'https://img.wlwywlqk.top/page.png';

const $canvas = document.querySelector("#page");

const WIDTH = 300;
const HEIGHT = 500;

$canvas.width = WIDTH;
$canvas.height = HEIGHT;

const $img = new Image(WIDTH, HEIGHT);
$img.onload = start;
$img.crossOrigin = "anonymous";
$img.src = IMG_PAGE;

function start() {
  const ctx = $canvas.getContext("2d");
  ctx.drawImage($img, 0, 0, WIDTH, HEIGHT);

  /*
    data: Uint8ClampedArray
    图片像素数据,每个像素占4个值
    [R,G,B,A,R,G,B,A...]
   */
  const imgData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const newImgData = ctx.createImageData(WIDTH, HEIGHT);

  $canvas.addEventListener("mousemove", onMouseMove);

  function onMouseMove(e) {
    const offsetX = clamp(e.offsetX, 0, WIDTH - 1);
    const offsetY = clamp(e.offsetY, 0, HEIGHT - 1);

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // 两点连线的角度
    const beta = Math.atan2(HEIGHT - offsetY, WIDTH - offsetX);

    const tanBeta = Math.tan(beta);
    const sinBeta = Math.sin(beta);

    // 两点连线m的长度
    const len = (HEIGHT - offsetY) / sinBeta;

    // 过点[offsetX, offsetY]作连线的垂线，交下边于点[bottomX, bottomY]，bottomX >=0，过点[bottomX,bottomY]作直线m的垂线n，交上边或右边于点[topX,topY]。
    // 点[bottomX, bottomY]与点[topX,topY]是模拟翻页时的折线
    const bottomY = HEIGHT;
    let bottomX = offsetX - (bottomY - offsetY) * tanBeta;
    if (bottomX < 0) {
      bottomX = 0;
    }

    let topY = 0;
    let topX = bottomX + HEIGHT * tanBeta;
    if (topX > WIDTH) {
      topX = WIDTH;
      topY = bottomY - (WIDTH - bottomX) / tanBeta;
    }

    // [topX,topY]和[bottomX,bottomY]两点连线l与水平线的夹角
    const theta = Math.atan2(bottomY - topY, bottomX - topX) - Math.PI / 2;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    // 直线l的斜率
    const slope = (bottomX - topX) / (bottomY - topY);

    drawCurlPage();
    // 画辅助线
    drawHelperLines();

    function drawCurlPage() {
      for (let y = 0; y < HEIGHT; y++) {
        // 与直线l的x交点，l左边是没有卷曲的部分，右边是卷曲的部分，分开处理。
        const crossX = bottomX - (bottomY - y) * slope;

        // 直线l左边
        for (let x = 0; x < crossX >> 0; x++) {
          const pos = (y * WIDTH + x) * 4;
          newImgData.data[pos] = imgData.data[pos];
          newImgData.data[pos + 1] = imgData.data[pos + 1];
          newImgData.data[pos + 2] = imgData.data[pos + 2];
          newImgData.data[pos + 3] = imgData.data[pos + 3];
        }
        // 直线l右边
        for (let x = crossX >> 0; x <= WIDTH; x++) {
          const pos = (y * WIDTH + x) * 4;

          const dx = x - crossX;
          const d = dx * cosTheta;
          // 当rate>0.5时，说明当前像素点映射在背面。
          const rate = d / len;

          // 页面下的阴影
          const opacity = ((len - d) / len) * 255;
          newImgData.data[pos] = 0;
          newImgData.data[pos + 1] = 0;
          newImgData.data[pos + 2] = 0;
          newImgData.data[pos + 3] = opacity;

          // 算出点在半圆映射中的位移，其中半圆的周长为len。
          // y=x 与 y=len/π·sin(πx/len) 相减得到offset。即点映射的位移
          const offset = d - Math.sin((Math.PI * d) / len) * (len / Math.PI);
          const targetX = (x - offset * cosTheta + 0.5) >> 0;
          const targetY = (y - offset * sinTheta + 0.5) >> 0;

          const targetPos = (targetY * WIDTH + targetX) * 4;

          // 页面加上简易的阴影，加强立体效果
          const gray = rate <= 0.5 ? -127 * rate : 127 * (rate - 0.5);

          newImgData.data[targetPos] = imgData.data[pos] + gray;
          newImgData.data[targetPos + 1] = imgData.data[pos + 1] + gray;
          newImgData.data[targetPos + 2] = imgData.data[pos + 2] + gray;
          newImgData.data[targetPos + 3] = imgData.data[pos + 3];

          // 在像素点旋转映射的时候会有漏点，做个强行插值
          newImgData.data[targetPos + 4] = imgData.data[pos] + gray;
          newImgData.data[targetPos + 5] = imgData.data[pos + 1] + gray;
          newImgData.data[targetPos + 6] = imgData.data[pos + 2] + gray;
          newImgData.data[targetPos + 7] = imgData.data[pos + 3];
        }
      }

      ctx.putImageData(newImgData, 0, 0);
    }

    function drawHelperLines() {
      ctx.beginPath();
      ctx.font = `8px sans-serif`;
      ctx.strokeStyle = "white";
      ctx.moveTo(WIDTH, HEIGHT);
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();

      ctx.beginPath();
      ctx.save();
      ctx.fillStyle = "white";
      ctx.arc(offsetX, offsetY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("[offsetX,offsetY]", offsetX, offsetY);
      ctx.restore();

      ctx.beginPath();
      ctx.save();
      ctx.fillStyle = "white";
      ctx.arc(bottomX, bottomY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("[bottomX,bottomY]", bottomX, bottomY);
      ctx.restore();

      ctx.beginPath();
      ctx.save();
      ctx.fillStyle = "white";
      ctx.arc(topX, topY, 2, 0, Math.PI * 2);
      ctx.fill();
      const textMetrics = ctx.measureText("[topX,topY]");
      ctx.fillText(
        "[topX,topY]",
        topX - textMetrics.width,
        topY +
          textMetrics.actualBoundingBoxAscent +
          textMetrics.actualBoundingBoxDescent
      );
      ctx.restore();

      ctx.beginPath();
      ctx.save();
      ctx.strokeStyle = "white";
      ctx.moveTo(topX, topY);
      ctx.lineTo(bottomX, bottomY);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function clamp(num, min = num, max = num) {
  return Math.min(max, Math.max(min, num));
}
