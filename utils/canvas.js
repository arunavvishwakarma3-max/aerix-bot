// Canvas utility for welcome images
// Requires optional dependency: canvas (npm install canvas)

export async function createWelcomeImage(member) {
  try {
    const canvas = await import('canvas');
    const { createCanvas, loadImage } = canvas.default || canvas;

    const width = 800;
    const height = 300;
    const Canvas = createCanvas(width, height);
    const ctx = Canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#5865F2');
    gradient.addColorStop(1, '#ED4245');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Avatar
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.beginPath();
    ctx.arc(150, 150, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 70, 70, 160, 160);

    // Text
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`Welcome ${member.user.username}!`, 280, 130);
    ctx.font = '24px sans-serif';
    ctx.fillText(`You are member #${member.guild.memberCount}`, 280, 180);

    return Canvas.toBuffer();
  } catch {
    throw new Error('Canvas module not available');
  }
}
