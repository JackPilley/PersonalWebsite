class DirectionalLight
{
    direction;
    color;
    viewMatrix = glMatrix.mat4.create();

    constructor(direction, color)
    {
        this.direction = new Float32Array(direction);
        this.color = new Float32Array(color);

        let lightOrigin = glMatrix.vec3.create();
        glMatrix.vec3.multiply(lightOrigin, this.direction, [5,5,5]);
        glMatrix.mat4.lookAt(this.viewMatrix, lightOrigin, [0,0,0], [0,1,0]);
    }
}