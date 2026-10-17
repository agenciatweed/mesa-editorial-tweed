from PIL import Image
import sys,json
with Image.open(sys.argv[1]) as image:
    width,height=image.size
    assert width>=600 and height>=400 and width*height<=80_000_000, 'Use uma capa com pelo menos 600 x 400 px e no maximo 80 MP.'
    image.verify()
print(json.dumps({'width':width,'height':height}))
