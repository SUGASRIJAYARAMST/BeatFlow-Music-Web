class PlaylistNode {
  constructor(song, position = 0) {
    this.song = song;
    this.position = position;
    this.addedAt = new Date();
    this.next = null;
    this.prev = null;
  }
}

class PlaylistLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  append(song) {
    const newNode = new PlaylistNode(song, this.size);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }
    this.size++;
    return newNode;
  }

  prepend(song) {
    const newNode = new PlaylistNode(song, 0);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
      this._updatePositions();
    }
    this.size++;
    return newNode;
  }

  remove(songId) {
    let current = this.head;
    while (current) {
      if (
        current.song._id === songId ||
        current.song._id?.toString() === songId
      ) {
        if (current.prev) current.prev.next = current.next;
        else this.head = current.next;
        if (current.next) current.next.prev = current.prev;
        else this.tail = current.prev;
        this.size--;
        this._updatePositions();
        return true;
      }
      current = current.next;
    }
    return false;
  }

  insertAt(song, index) {
    if (index === 0) return this.prepend(song);
    if (index >= this.size) return this.append(song);

    let current = this.head;
    for (let i = 0; i < index; i++) current = current.next;

    const newNode = new PlaylistNode(song, index);
    newNode.prev = current.prev;
    newNode.next = current;
    current.prev.next = newNode;
    current.prev = newNode;
    this.size++;
    this._updatePositions();
    return newNode;
  }

  moveSong(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const songs = this.toArray();
    const [moved] = songs.splice(fromIndex, 1);
    songs.splice(toIndex, 0, moved);
    this.fromArray(songs);
  }

  getAt(index) {
    let current = this.head;
    for (let i = 0; i < index && current; i++) current = current.next;
    return current;
  }

  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current.song);
      current = current.next;
    }
    return result;
  }

  fromArray(songs) {
    this.head = null;
    this.tail = null;
    this.size = 0;
    songs.forEach((song) => this.append(song));
  }

  reverse() {
    const songs = this.toArray().reverse();
    this.fromArray(songs);
  }

  shuffle() {
    const songs = this.toArray();
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }
    this.fromArray(songs);
  }

  _updatePositions() {
    let current = this.head;
    let pos = 0;
    while (current) {
      current.position = pos++;
      current = current.next;
    }
  }

  toJSON() {
    const songs = [];
    let current = this.head;
    while (current) {
      songs.push({
        song: current.song,
        position: current.position,
        addedAt: current.addedAt,
      });
      current = current.next;
    }
    return songs;
  }
}

class PlaylistTreeNode {
  constructor(name, type = "category") {
    this.name = name;
    this.type = type;
    this.songs = [];
    this.children = [];
    this.parent = null;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  addSong(song) {
    this.songs.push(song);
  }

  removeSong(songId) {
    this.songs = this.songs.filter(
      (s) => s._id !== songId && s._id?.toString() !== songId,
    );
    for (const child of this.children) {
      child.removeSong(songId);
    }
  }

  getAllSongs() {
    let songs = [...this.songs];
    for (const child of this.children) {
      songs = songs.concat(child.getAllSongs());
    }
    return songs;
  }

  findNode(name) {
    if (this.name === name) return this;
    for (const child of this.children) {
      const found = child.findNode(name);
      if (found) return found;
    }
    return null;
  }

  getDepth() {
    if (this.children.length === 0) return 1;
    return 1 + Math.max(...this.children.map((c) => c.getDepth()));
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      songs: this.songs,
      children: this.children.map((c) => c.toJSON()),
      depth: this.getDepth(),
    };
  }
}

function buildGenreTree(songs) {
  const root = new PlaylistTreeNode("All Songs", "root");
  const genreMap = {};
  for (const song of songs) {
    const genre = song.genre || "Other";
    if (!genreMap[genre]) {
      const genreNode = new PlaylistTreeNode(genre, "genre");
      root.addChild(genreNode);
      genreMap[genre] = genreNode;
    }
    genreMap[genre].addSong(song);
  }
  return root;
}

function buildArtistTree(songs) {
  const root = new PlaylistTreeNode("All Songs", "root");
  const artistMap = {};
  for (const song of songs) {
    if (!artistMap[song.artist]) {
      const artistNode = new PlaylistTreeNode(song.artist, "artist");
      root.addChild(artistNode);
      artistMap[song.artist] = artistNode;
    }
    artistMap[song.artist].addSong(song);
  }
  return root;
}

export {
  PlaylistLinkedList,
  PlaylistTreeNode,
  buildGenreTree,
  buildArtistTree,
};
