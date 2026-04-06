import axios from "axios";

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";

export const searchSongMetadata = async (title, artist) => {
  try {
    const query = encodeURIComponent(
      `recording:"${title}"${artist ? ` AND artist:"${artist}"` : ""}`,
    );
    const response = await axios.get(
      `${MUSICBRAINZ_BASE}/recording?query=${query}&fmt=json&limit=5`,
      {
        headers: { "User-Agent": "BeatFlow/1.0 (music-app)" },
        timeout: 5000,
      },
    );

    if (response.data.recordings && response.data.recordings.length > 0) {
      const recording = response.data.recordings[0];
      return {
        title: recording.title || title,
        artist:
          recording["artist-credit"]?.map((c) => c.name).join(", ") ||
          artist ||
          "Unknown",
        album:
          recording.relations?.find((r) => r.type === "part of")?.title || "",
        duration: recording.length ? Math.floor(recording.length / 1000) : 0,
        genre: recording.tags?.[0]?.name || "Unknown",
        musicbrainzId: recording.id,
        found: true,
      };
    }
    return { title, artist, found: false };
  } catch (error) {
    console.log("MusicBrainz search error:", error.message);
    return { title, artist, found: false };
  }
};

export const searchArtistMetadata = async (artistName) => {
  try {
    const query = encodeURIComponent(`artist:"${artistName}"`);
    const response = await axios.get(
      `${MUSICBRAINZ_BASE}/artist?query=${query}&fmt=json&limit=5`,
      {
        headers: { "User-Agent": "BeatFlow/1.0 (music-app)" },
        timeout: 5000,
      },
    );

    if (response.data.artists && response.data.artists.length > 0) {
      const artist = response.data.artists[0];
      return {
        name: artist.name,
        genre: artist.tags?.[0]?.name || "",
        country: artist.country || "",
        musicbrainzId: artist.id,
        found: true,
      };
    }
    return { name: artistName, found: false };
  } catch (error) {
    console.log("MusicBrainz artist search error:", error.message);
    return { name: artistName, found: false };
  }
};

export const searchAlbumMetadata = async (albumTitle, artistName) => {
  try {
    const query = encodeURIComponent(
      `release:"${albumTitle}"${artistName ? ` AND artist:"${artistName}"` : ""}`,
    );
    const response = await axios.get(
      `${MUSICBRAINZ_BASE}/release?query=${query}&fmt=json&limit=5`,
      {
        headers: { "User-Agent": "BeatFlow/1.0 (music-app)" },
        timeout: 5000,
      },
    );

    if (response.data.releases && response.data.releases.length > 0) {
      const release = response.data.releases[0];
      return {
        title: release.title,
        artist: release["artist-credit"]?.map((c) => c.name).join(", ") || "",
        releaseYear: release.date
          ? parseInt(release.date.substring(0, 4))
          : null,
        genre: release.tags?.[0]?.name || "",
        musicbrainzId: release.id,
        found: true,
      };
    }
    return { title: albumTitle, found: false };
  } catch (error) {
    console.log("MusicBrainz album search error:", error.message);
    return { title: albumTitle, found: false };
  }
};
