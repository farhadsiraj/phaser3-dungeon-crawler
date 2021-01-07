import Phaser from 'phaser';
import { debugDraw } from '../utils/debug';
import { createLizardAnims } from '../anims/EnemyAnims';
import { createCharacterAnims } from '../anims/CharacterAnims';
import Lizard from '~/enemies/Lizard';
import '../characters/Faune';
import Faune from '../characters/Faune';
import { sceneEvents } from '../events/EventCenter';

export default class Game extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private faune!: Faune;
  private playerLizardsCollider?: Phaser.Physics.Arcade.Collider;
  private knives!: Phaser.Physics.Arcade.Group;
  private lizards!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('game');
  }

  preload() {
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  create() {
    this.scene.run('game-ui');
    createCharacterAnims(this.anims);
    createLizardAnims(this.anims);

    const map = this.make.tilemap({ key: 'dungeon' });
    const tileset = map.addTilesetImage('dungeon', 'tiles', 16, 16, 1, 2);
    map.createLayer('Ground', tileset);
    const wallsLayer = map.createLayer('Walls', tileset);

    wallsLayer.setCollisionByProperty({ collides: true });

    // debugDraw(wallsLayer, this);

    this.knives = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
    });

    this.faune = this.add.faune(128, 128, 'faune');
    this.faune.setKnives(this.knives);

    this.cameras.main.startFollow(this.faune, true);

    this.lizards = this.physics.add.group({
      classType: Lizard,
      createCallback: (go) => {
        const lizGo = go as Lizard;
        lizGo.body.onCollide = true;
      },
    });

    const lizardsLayer = map.getObjectLayer('Lizards');
    lizardsLayer.objects.forEach((lizObj) => {
      this.lizards.get(
        lizObj.x! + lizObj.width! * 0.5,
        lizObj.y! - lizObj.height! * 0.5,
        'lizard'
      );
    });

    this.physics.add.collider(this.faune, wallsLayer);
    this.physics.add.collider(this.lizards, wallsLayer);
    this.physics.add.collider(
      this.knives,
      wallsLayer,
      this.handleKnifeWallCollision,
      undefined,
      this
    );
    this.physics.add.collider(
      this.knives,
      this.lizards,
      this.handleKnifeLizardCollision,
      undefined,
      this
    );
    this.playerLizardsCollider = this.physics.add.collider(
      this.lizards,
      this.faune,
      this.handlePlayerLizardCollision,
      undefined,
      this
    );
  }
  private handleKnifeWallCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    this.knives.killAndHide(obj1);
    obj1.destroy();
  }
  private handleKnifeLizardCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    this.knives.killAndHide(obj1);
    // this.lizards.killAndHide(obj2);
    obj1.destroy();
    obj2.destroy();
  }

  private handlePlayerLizardCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    const lizard = obj2 as Lizard;

    const dx = this.faune.x - lizard.x;
    const dy = this.faune.y - lizard.y;

    const dir = new Phaser.Math.Vector2(dx, dy).normalize().scale(200);

    this.faune.handleDamage(dir);

    sceneEvents.emit('player-health-changed', this.faune.health);

    if (this.faune.health <= 0) {
      this.playerLizardsCollider?.destroy();
    }
  }

  // t = total time, dt = delta time
  update(t: number, dt: number) {
    if (this.faune) {
      this.faune.update(this.cursors);
    }
  }
}
