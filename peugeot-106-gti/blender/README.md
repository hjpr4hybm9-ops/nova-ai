# 3D model kaynağı

`car_gen.py`, `../assets/peugeot-106-gti.glb` dosyasını üreten Blender Python
script'idir. Modeli değiştirmek istersen bu dosyayı düzenleyip yeniden
çalıştır:

```
cd blender
blender --background --python car_gen.py
```

Script bulunduğu klasöre `peugeot-106-gti.glb` üretir; bunu
`../assets/peugeot-106-gti.glb` üzerine kopyalaman yeterli. Blender'ın glTF
eklentisi `numpy` gerektirir — sistemde yoksa `apt-get install python3-numpy`
(veya Blender'ın kullandığı Python'a `pip install numpy`) gerekir.
