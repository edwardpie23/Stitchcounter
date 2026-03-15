import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

// Full DMC thread color palette (subset of 454 colors, key ones for matching)
const DMC_COLORS = [
  { code: 'White', name: 'White', r: 255, g: 255, b: 255 },
  { code: 'Ecru', name: 'Ecru', r: 240, g: 234, b: 218 },
  { code: '000', name: 'White Black', r: 0, g: 0, b: 0 },
  { code: '150', name: 'Dusty Rose Ultra Vy Dk', r: 171, g: 31, b: 61 },
  { code: '151', name: 'Dusty Rose Vry Lt', r: 240, g: 204, b: 205 },
  { code: '152', name: 'Shell Pink Med Light', r: 225, g: 152, b: 140 },
  { code: '153', name: 'Violet Very Light', r: 226, g: 206, b: 222 },
  { code: '154', name: 'Grape Very Dark', r: 88, g: 44, b: 63 },
  { code: '155', name: 'Blue Violet Med Dark', r: 148, g: 143, b: 186 },
  { code: '156', name: 'Blue Violet Med Lt', r: 172, g: 179, b: 213 },
  { code: '157', name: 'Cornflower Blue Vy Lt', r: 172, g: 185, b: 213 },
  { code: '158', name: 'Cornflower Blu Med Vy Dk', r: 77, g: 89, b: 131 },
  { code: '159', name: 'Blue Gray Light', r: 195, g: 202, b: 218 },
  { code: '160', name: 'Blue Gray Medium', r: 141, g: 153, b: 182 },
  { code: '161', name: 'Blue Gray', r: 106, g: 119, b: 157 },
  { code: '162', name: 'Blue Ultra Very Light', r: 214, g: 232, b: 243 },
  { code: '163', name: 'Celadon Green Med', r: 90, g: 145, b: 107 },
  { code: '164', name: 'Forest Green Light', r: 195, g: 215, b: 177 },
  { code: '165', name: 'Moss Green Very Light', r: 237, g: 240, b: 176 },
  { code: '166', name: 'Moss Green Med Light', r: 189, g: 196, b: 71 },
  { code: '167', name: 'Yellow Beige Very Dark', r: 172, g: 122, b: 71 },
  { code: '168', name: 'Pewter Very Light', r: 211, g: 211, b: 211 },
  { code: '169', name: 'Pewter Light', r: 153, g: 153, b: 153 },
  { code: '208', name: 'Lavender Very Dark', r: 131, g: 79, b: 145 },
  { code: '209', name: 'Lavender Dark', r: 162, g: 113, b: 173 },
  { code: '210', name: 'Lavender Medium', r: 196, g: 158, b: 203 },
  { code: '211', name: 'Lavender Light', r: 224, g: 198, b: 228 },
  { code: '221', name: 'Shell Pink Very Dark', r: 154, g: 71, b: 74 },
  { code: '223', name: 'Shell Pink Light', r: 204, g: 130, b: 116 },
  { code: '224', name: 'Shell Pink Very Light', r: 230, g: 178, b: 165 },
  { code: '225', name: 'Shell Pink Ultra Very Lt', r: 244, g: 220, b: 211 },
  { code: '300', name: 'Mahogany Very Dark', r: 136, g: 58, b: 10 },
  { code: '301', name: 'Mahogany Medium', r: 182, g: 96, b: 41 },
  { code: '304', name: 'Christmas Red Medium', r: 183, g: 31, b: 45 },
  { code: '307', name: 'Lemon', r: 253, g: 231, b: 62 },
  { code: '309', name: 'Rose Dark', r: 196, g: 62, b: 84 },
  { code: '310', name: 'Black', r: 0, g: 0, b: 0 },
  { code: '311', name: 'Navy Blue Medium', r: 26, g: 71, b: 110 },
  { code: '312', name: 'Navy Blue Light', r: 49, g: 100, b: 146 },
  { code: '315', name: 'Antique Mauve Med Dk', r: 143, g: 79, b: 88 },
  { code: '316', name: 'Antique Mauve Medium', r: 188, g: 122, b: 129 },
  { code: '317', name: 'Pewter Gray', r: 113, g: 111, b: 115 },
  { code: '318', name: 'Steel Gray Light', r: 171, g: 172, b: 174 },
  { code: '319', name: 'Pistachio Grn Very Dk', r: 52, g: 103, b: 63 },
  { code: '320', name: 'Pistachio Green Med', r: 105, g: 147, b: 101 },
  { code: '321', name: 'Christmas Red', r: 197, g: 41, b: 50 },
  { code: '322', name: 'Navy Blue Dark', r: 70, g: 118, b: 162 },
  { code: '326', name: 'Rose Very Dark', r: 186, g: 46, b: 72 },
  { code: '327', name: 'Violet Dark', r: 100, g: 44, b: 107 },
  { code: '333', name: 'Blue Violet Very Dark', r: 89, g: 74, b: 142 },
  { code: '334', name: 'Baby Blue Medium', r: 101, g: 149, b: 190 },
  { code: '335', name: 'Rose', r: 229, g: 73, b: 105 },
  { code: '336', name: 'Navy Blue', r: 26, g: 60, b: 107 },
  { code: '340', name: 'Blue Violet Medium', r: 162, g: 152, b: 196 },
  { code: '341', name: 'Blue Violet Light', r: 174, g: 185, b: 218 },
  { code: '347', name: 'Salmon Very Dark', r: 191, g: 51, b: 48 },
  { code: '349', name: 'Coral Dark', r: 205, g: 54, b: 47 },
  { code: '350', name: 'Coral Medium', r: 218, g: 79, b: 67 },
  { code: '351', name: 'Coral', r: 228, g: 105, b: 90 },
  { code: '352', name: 'Coral Light', r: 240, g: 148, b: 130 },
  { code: '353', name: 'Peach', r: 246, g: 189, b: 172 },
  { code: '355', name: 'Terra Cotta Dark', r: 168, g: 71, b: 48 },
  { code: '356', name: 'Terra Cotta Medium', r: 199, g: 108, b: 83 },
  { code: '367', name: 'Pistachio Green Dk', r: 94, g: 130, b: 87 },
  { code: '368', name: 'Pistachio Green Lt', r: 168, g: 199, b: 159 },
  { code: '369', name: 'Pistachio Green Vy Lt', r: 214, g: 233, b: 204 },
  { code: '370', name: 'Mustard Medium', r: 167, g: 137, b: 71 },
  { code: '371', name: 'Mustard', r: 179, g: 150, b: 82 },
  { code: '372', name: 'Mustard Light', r: 194, g: 168, b: 104 },
  { code: '400', name: 'Mahogany Dark', r: 161, g: 68, b: 19 },
  { code: '402', name: 'Mahogany Very Light', r: 246, g: 182, b: 133 },
  { code: '407', name: 'Desert Sand Dark', r: 188, g: 121, b: 91 },
  { code: '413', name: 'Pewter Gray Dark', r: 81, g: 79, b: 82 },
  { code: '414', name: 'Steel Gray Dark', r: 142, g: 141, b: 143 },
  { code: '415', name: 'Pearl Gray', r: 210, g: 210, b: 211 },
  { code: '420', name: 'Hazel Nut Brown Dk', r: 156, g: 104, b: 49 },
  { code: '422', name: 'Hazel Nut Brown Lt', r: 205, g: 162, b: 108 },
  { code: '433', name: 'Brown Medium', r: 135, g: 77, b: 31 },
  { code: '434', name: 'Brown Light', r: 168, g: 100, b: 45 },
  { code: '435', name: 'Brown Very Light', r: 197, g: 128, b: 66 },
  { code: '436', name: 'Tan', r: 215, g: 154, b: 88 },
  { code: '437', name: 'Tan Light', r: 230, g: 188, b: 135 },
  { code: '444', name: 'Lemon Dark', r: 252, g: 205, b: 0 },
  { code: '445', name: 'Lemon Light', r: 255, g: 248, b: 147 },
  { code: '451', name: 'Shell Gray Dark', r: 153, g: 135, b: 125 },
  { code: '452', name: 'Shell Gray Medium', r: 193, g: 179, b: 168 },
  { code: '453', name: 'Shell Gray Light', r: 218, g: 207, b: 198 },
  { code: '469', name: 'Avocado Green', r: 111, g: 119, b: 44 },
  { code: '470', name: 'Avocado Green Light', r: 141, g: 163, b: 63 },
  { code: '471', name: 'Avocado Green Vy Lt', r: 171, g: 190, b: 107 },
  { code: '472', name: 'Avocado Green Ultra Lt', r: 217, g: 228, b: 162 },
  { code: '498', name: 'Christmas Red Dark', r: 168, g: 27, b: 46 },
  { code: '500', name: 'Blue Green Very Dark', r: 30, g: 82, b: 59 },
  { code: '501', name: 'Blue Green Dark', r: 58, g: 107, b: 82 },
  { code: '502', name: 'Blue Green', r: 95, g: 140, b: 112 },
  { code: '503', name: 'Blue Green Medium', r: 139, g: 177, b: 155 },
  { code: '504', name: 'Blue Green Very Light', r: 183, g: 211, b: 196 },
  { code: '517', name: 'Wedgewood Dark', r: 52, g: 127, b: 162 },
  { code: '518', name: 'Wedgewood Light', r: 69, g: 154, b: 183 },
  { code: '519', name: 'Sky Blue', r: 113, g: 179, b: 205 },
  { code: '520', name: 'Fern Green Dark', r: 90, g: 104, b: 62 },
  { code: '522', name: 'Fern Green', r: 140, g: 153, b: 112 },
  { code: '523', name: 'Fern Green Light', r: 162, g: 176, b: 136 },
  { code: '524', name: 'Fern Green Very Light', r: 186, g: 199, b: 162 },
  { code: '535', name: 'Ash Gray Very Light', r: 96, g: 96, b: 101 },
  { code: '543', name: 'Beige Brown Ultra Vy Lt', r: 232, g: 213, b: 193 },
  { code: '550', name: 'Violet Very Dark', r: 89, g: 28, b: 97 },
  { code: '552', name: 'Violet Medium', r: 133, g: 71, b: 143 },
  { code: '553', name: 'Violet', r: 157, g: 100, b: 162 },
  { code: '554', name: 'Violet Light', r: 205, g: 166, b: 207 },
  { code: '561', name: 'Jade Very Dark', r: 51, g: 116, b: 83 },
  { code: '562', name: 'Jade Medium', r: 80, g: 149, b: 107 },
  { code: '563', name: 'Jade Light', r: 130, g: 183, b: 147 },
  { code: '564', name: 'Jade Very Light', r: 163, g: 205, b: 175 },
  { code: '580', name: 'Moss Green Dark', r: 104, g: 115, b: 38 },
  { code: '581', name: 'Moss Green', r: 129, g: 143, b: 45 },
  { code: '597', name: 'Turquoise', r: 75, g: 167, b: 183 },
  { code: '598', name: 'Turquoise Light', r: 128, g: 197, b: 208 },
  { code: '600', name: 'Cranberry Very Dark', r: 198, g: 49, b: 89 },
  { code: '601', name: 'Cranberry Dark', r: 211, g: 45, b: 98 },
  { code: '602', name: 'Cranberry Medium', r: 224, g: 76, b: 120 },
  { code: '603', name: 'Cranberry', r: 237, g: 113, b: 149 },
  { code: '604', name: 'Cranberry Light', r: 244, g: 158, b: 178 },
  { code: '605', name: 'Cranberry Very Light', r: 252, g: 199, b: 210 },
  { code: '606', name: 'Bright Orange Red', r: 237, g: 54, b: 26 },
  { code: '608', name: 'Bright Orange', r: 243, g: 99, b: 37 },
  { code: '610', name: 'Drab Brown Dark', r: 128, g: 95, b: 50 },
  { code: '611', name: 'Drab Brown', r: 155, g: 119, b: 71 },
  { code: '612', name: 'Drab Brown Light', r: 190, g: 160, b: 109 },
  { code: '613', name: 'Drab Brown Very Light', r: 220, g: 200, b: 160 },
  { code: '632', name: 'Desert Sand Ultra Vy Dk', r: 149, g: 82, b: 53 },
  { code: '640', name: 'Beige Gray Very Dark', r: 137, g: 127, b: 107 },
  { code: '642', name: 'Beige Gray Dark', r: 172, g: 162, b: 140 },
  { code: '644', name: 'Beige Gray Medium', r: 218, g: 213, b: 196 },
  { code: '645', name: 'Beaver Gray Very Dark', r: 107, g: 100, b: 95 },
  { code: '646', name: 'Beaver Gray Dark', r: 137, g: 130, b: 122 },
  { code: '647', name: 'Beaver Gray Medium', r: 169, g: 163, b: 155 },
  { code: '648', name: 'Beaver Gray Light', r: 197, g: 193, b: 186 },
  { code: '666', name: 'Bright Christmas Red', r: 221, g: 37, b: 51 },
  { code: '676', name: 'Old Gold Light', r: 224, g: 196, b: 131 },
  { code: '677', name: 'Old Gold Very Light', r: 240, g: 224, b: 181 },
  { code: '680', name: 'Old Gold Dark', r: 186, g: 138, b: 38 },
  { code: '699', name: 'Christmas Green', r: 15, g: 110, b: 40 },
  { code: '700', name: 'Christmas Green Bright', r: 24, g: 122, b: 47 },
  { code: '701', name: 'Christmas Green Light', r: 64, g: 148, b: 71 },
  { code: '702', name: 'Kelly Green', r: 81, g: 166, b: 72 },
  { code: '703', name: 'Chartreuse', r: 124, g: 188, b: 93 },
  { code: '704', name: 'Chartreuse Bright', r: 168, g: 213, b: 95 },
  { code: '712', name: 'Cream', r: 249, g: 243, b: 224 },
  { code: '718', name: 'Plum', r: 165, g: 40, b: 110 },
  { code: '720', name: 'Orange Spice Dark', r: 224, g: 101, b: 34 },
  { code: '721', name: 'Orange Spice Medium', r: 237, g: 131, b: 70 },
  { code: '722', name: 'Orange Spice Light', r: 243, g: 163, b: 104 },
  { code: '725', name: 'Topaz', r: 253, g: 198, b: 74 },
  { code: '726', name: 'Topaz Light', r: 255, g: 217, b: 91 },
  { code: '727', name: 'Topaz Very Light', r: 254, g: 235, b: 157 },
  { code: '728', name: 'Golden Yellow', r: 234, g: 175, b: 79 },
  { code: '729', name: 'Old Gold Medium', r: 204, g: 162, b: 68 },
  { code: '730', name: 'Olive Green Very Dark', r: 112, g: 104, b: 22 },
  { code: '731', name: 'Olive Green Dark', r: 134, g: 125, b: 28 },
  { code: '732', name: 'Olive Green', r: 148, g: 139, b: 33 },
  { code: '733', name: 'Olive Green Medium', r: 185, g: 177, b: 72 },
  { code: '734', name: 'Olive Green Light', r: 200, g: 196, b: 110 },
  { code: '738', name: 'Tan Very Light', r: 239, g: 206, b: 158 },
  { code: '739', name: 'Tan Ultra Very Light', r: 246, g: 226, b: 191 },
  { code: '740', name: 'Tangerine', r: 255, g: 144, b: 0 },
  { code: '741', name: 'Tangerine Medium', r: 255, g: 165, b: 33 },
  { code: '742', name: 'Tangerine Light', r: 255, g: 192, b: 78 },
  { code: '743', name: 'Yellow Medium', r: 253, g: 215, b: 95 },
  { code: '744', name: 'Yellow Pale', r: 254, g: 232, b: 140 },
  { code: '745', name: 'Yellow Pale Light', r: 254, g: 241, b: 175 },
  { code: '746', name: 'Off White', r: 249, g: 246, b: 226 },
  { code: '747', name: 'Sky Blue Very Light', r: 219, g: 243, b: 248 },
  { code: '754', name: 'Peach Light', r: 244, g: 200, b: 181 },
  { code: '758', name: 'Terra Cotta Very Light', r: 233, g: 173, b: 152 },
  { code: '760', name: 'Salmon', r: 240, g: 155, b: 143 },
  { code: '761', name: 'Salmon Light', r: 247, g: 191, b: 182 },
  { code: '762', name: 'Pearl Gray Very Light', r: 229, g: 229, b: 229 },
  { code: '772', name: 'Yellow Green Very Lt', r: 214, g: 231, b: 196 },
  { code: '775', name: 'Baby Blue Very Light', r: 214, g: 232, b: 243 },
  { code: '776', name: 'Pink Medium', r: 247, g: 165, b: 174 },
  { code: '778', name: 'Antique Mauve Vy Lt', r: 218, g: 171, b: 171 },
  { code: '780', name: 'Topaz Ultra Very Dark', r: 155, g: 96, b: 20 },
  { code: '781', name: 'Topaz Very Dark', r: 175, g: 114, b: 30 },
  { code: '782', name: 'Topaz Dark', r: 191, g: 133, b: 40 },
  { code: '783', name: 'Topaz Medium', r: 207, g: 152, b: 53 },
  { code: '791', name: 'Cornflower Blue Vy Dk', r: 66, g: 71, b: 120 },
  { code: '792', name: 'Cornflower Blue Dark', r: 90, g: 103, b: 152 },
  { code: '793', name: 'Cornflower Blue Med', r: 121, g: 137, b: 181 },
  { code: '794', name: 'Cornflower Blue Light', r: 153, g: 170, b: 207 },
  { code: '796', name: 'Royal Blue Dark', r: 30, g: 77, b: 137 },
  { code: '797', name: 'Royal Blue', r: 34, g: 85, b: 151 },
  { code: '798', name: 'Delft Blue Dark', r: 70, g: 113, b: 170 },
  { code: '799', name: 'Delft Blue Medium', r: 107, g: 147, b: 192 },
  { code: '800', name: 'Delft Blue Pale', r: 168, g: 192, b: 221 },
  { code: '801', name: 'Coffee Brown Dark', r: 107, g: 60, b: 22 },
  { code: '806', name: 'Peacock Blue Dark', r: 34, g: 143, b: 164 },
  { code: '807', name: 'Peacock Blue', r: 73, g: 167, b: 183 },
  { code: '809', name: 'Delft Blue', r: 134, g: 164, b: 204 },
  { code: '813', name: 'Blue Light', r: 152, g: 193, b: 222 },
  { code: '814', name: 'Garnet Dark', r: 138, g: 18, b: 34 },
  { code: '815', name: 'Garnet Medium', r: 161, g: 23, b: 41 },
  { code: '816', name: 'Garnet', r: 183, g: 28, b: 46 },
  { code: '817', name: 'Coral Red Very Dark', r: 198, g: 34, b: 33 },
  { code: '818', name: 'Baby Pink', r: 253, g: 213, b: 213 },
  { code: '819', name: 'Baby Pink Light', r: 253, g: 229, b: 229 },
  { code: '820', name: 'Royal Blue Very Dark', r: 21, g: 54, b: 117 },
  { code: '822', name: 'Beige Gray Light', r: 229, g: 220, b: 198 },
  { code: '823', name: 'Navy Blue Dark', r: 16, g: 32, b: 88 },
  { code: '824', name: 'Blue Very Dark', r: 43, g: 95, b: 143 },
  { code: '825', name: 'Blue Dark', r: 55, g: 118, b: 163 },
  { code: '826', name: 'Blue Medium', r: 87, g: 151, b: 190 },
  { code: '827', name: 'Blue Very Light', r: 178, g: 212, b: 232 },
  { code: '828', name: 'Blue Ultra Very Light', r: 199, g: 229, b: 240 },
  { code: '829', name: 'Golden Olive Very Dark', r: 127, g: 98, b: 28 },
  { code: '830', name: 'Golden Olive Dark', r: 149, g: 118, b: 41 },
  { code: '831', name: 'Golden Olive Medium', r: 169, g: 139, b: 57 },
  { code: '832', name: 'Golden Olive', r: 186, g: 154, b: 62 },
  { code: '833', name: 'Golden Olive Light', r: 207, g: 177, b: 90 },
  { code: '834', name: 'Golden Olive Very Light', r: 227, g: 200, b: 117 },
  { code: '838', name: 'Beige Brown Very Dark', r: 87, g: 63, b: 38 },
  { code: '839', name: 'Beige Brown Dark', r: 107, g: 81, b: 51 },
  { code: '840', name: 'Beige Brown Medium', r: 152, g: 116, b: 79 },
  { code: '841', name: 'Beige Brown Light', r: 188, g: 155, b: 116 },
  { code: '842', name: 'Beige Brown Very Light', r: 215, g: 188, b: 152 },
  { code: '844', name: 'Beaver Gray Ultra Dark', r: 75, g: 73, b: 72 },
  { code: '869', name: 'Hazel Nut Brown Vy Dk', r: 127, g: 79, b: 28 },
  { code: '890', name: 'Pistachio Grn Ult Dk', r: 27, g: 73, b: 42 },
  { code: '891', name: 'Carnation Dark', r: 240, g: 85, b: 103 },
  { code: '892', name: 'Carnation Medium', r: 244, g: 116, b: 126 },
  { code: '893', name: 'Carnation Light', r: 248, g: 149, b: 157 },
  { code: '894', name: 'Carnation Very Light', r: 252, g: 183, b: 189 },
  { code: '895', name: 'Hunter Green Very Dark', r: 39, g: 81, b: 45 },
  { code: '898', name: 'Coffee Brown Very Dark', r: 77, g: 37, b: 11 },
  { code: '899', name: 'Rose Medium', r: 236, g: 118, b: 131 },
  { code: '900', name: 'Burnt Orange Dark', r: 208, g: 74, b: 14 },
  { code: '902', name: 'Garnet Very Dark', r: 117, g: 10, b: 25 },
  { code: '904', name: 'Parrot Green Very Dark', r: 72, g: 120, b: 37 },
  { code: '905', name: 'Parrot Green Dark', r: 90, g: 148, b: 45 },
  { code: '906', name: 'Parrot Green Medium', r: 117, g: 183, b: 59 },
  { code: '907', name: 'Parrot Green Light', r: 166, g: 212, b: 95 },
  { code: '909', name: 'Emerald Green Very Dark', r: 12, g: 120, b: 64 },
  { code: '910', name: 'Emerald Green Dark', r: 15, g: 136, b: 73 },
  { code: '911', name: 'Emerald Green Medium', r: 24, g: 157, b: 88 },
  { code: '912', name: 'Emerald Green Light', r: 58, g: 177, b: 110 },
  { code: '913', name: 'Nile Green Medium', r: 104, g: 185, b: 141 },
  { code: '915', name: 'Plum Dark', r: 148, g: 10, b: 75 },
  { code: '917', name: 'Plum Medium', r: 173, g: 24, b: 99 },
  { code: '918', name: 'Red Copper Dark', r: 152, g: 59, b: 19 },
  { code: '919', name: 'Red Copper', r: 181, g: 74, b: 27 },
  { code: '920', name: 'Copper Medium', r: 191, g: 95, b: 42 },
  { code: '921', name: 'Copper', r: 204, g: 113, b: 50 },
  { code: '922', name: 'Copper Light', r: 221, g: 141, b: 76 },
  { code: '924', name: 'Gray Green Very Dark', r: 72, g: 100, b: 94 },
  { code: '926', name: 'Gray Green Medium', r: 127, g: 157, b: 152 },
  { code: '927', name: 'Gray Green Light', r: 163, g: 187, b: 181 },
  { code: '928', name: 'Gray Green Very Light', r: 202, g: 216, b: 212 },
  { code: '930', name: 'Antique Blue Dark', r: 79, g: 103, b: 124 },
  { code: '931', name: 'Antique Blue Medium', r: 104, g: 136, b: 160 },
  { code: '932', name: 'Antique Blue Light', r: 151, g: 176, b: 199 },
  { code: '934', name: 'Avocado Green Black', r: 57, g: 67, b: 24 },
  { code: '935', name: 'Avocado Green Dark', r: 74, g: 88, b: 37 },
  { code: '936', name: 'Avocado Green Very Dk', r: 81, g: 97, b: 39 },
  { code: '937', name: 'Avocado Green Medium', r: 102, g: 120, b: 50 },
  { code: '938', name: 'Coffee Brown Ultra Dk', r: 57, g: 24, b: 0 },
  { code: '939', name: 'Navy Blue Very Dark', r: 13, g: 23, b: 74 },
  { code: '943', name: 'Aquamarine Medium', r: 56, g: 168, b: 150 },
  { code: '945', name: 'Tawny', r: 245, g: 198, b: 159 },
  { code: '946', name: 'Burnt Orange Medium', r: 229, g: 107, b: 27 },
  { code: '947', name: 'Burnt Orange', r: 243, g: 130, b: 57 },
  { code: '948', name: 'Peach Very Light', r: 253, g: 227, b: 210 },
  { code: '950', name: 'Desert Sand Light', r: 225, g: 183, b: 156 },
  { code: '951', name: 'Tawny Light', r: 247, g: 215, b: 183 },
  { code: '954', name: 'Nile Green', r: 107, g: 194, b: 141 },
  { code: '955', name: 'Nile Green Light', r: 154, g: 216, b: 175 },
  { code: '956', name: 'Geranium', r: 247, g: 109, b: 109 },
  { code: '957', name: 'Geranium Pale', r: 252, g: 166, b: 169 },
  { code: '958', name: 'Sea Green Dark', r: 41, g: 178, b: 155 },
  { code: '959', name: 'Sea Green Medium', r: 78, g: 192, b: 169 },
  { code: '961', name: 'Dusty Rose Dark', r: 204, g: 101, b: 109 },
  { code: '962', name: 'Dusty Rose Medium', r: 222, g: 134, b: 140 },
  { code: '963', name: 'Dusty Rose Ultra Very Lt', r: 252, g: 213, b: 214 },
  { code: '964', name: 'Sea Green Light', r: 150, g: 221, b: 208 },
  { code: '966', name: 'Baby Green Medium', r: 168, g: 213, b: 179 },
  { code: '970', name: 'Pumpkin Light', r: 244, g: 140, b: 37 },
  { code: '971', name: 'Pumpkin', r: 244, g: 121, b: 0 },
  { code: '972', name: 'Canary Deep', r: 255, g: 182, b: 0 },
  { code: '973', name: 'Canary Bright', r: 255, g: 218, b: 0 },
  { code: '975', name: 'Golden Brown Dark', r: 140, g: 75, b: 19 },
  { code: '976', name: 'Golden Brown Medium', r: 200, g: 135, b: 63 },
  { code: '977', name: 'Golden Brown Light', r: 220, g: 160, b: 81 },
  { code: '986', name: 'Forest Green Very Dark', r: 51, g: 84, b: 46 },
  { code: '987', name: 'Forest Green Dark', r: 74, g: 115, b: 62 },
  { code: '988', name: 'Forest Green Medium', r: 107, g: 148, b: 90 },
  { code: '989', name: 'Forest Green', r: 138, g: 175, b: 115 },
  { code: '991', name: 'Aquamarine Dark', r: 57, g: 127, b: 106 },
  { code: '992', name: 'Aquamarine', r: 81, g: 166, b: 144 },
  { code: '993', name: 'Aquamarine Light', r: 120, g: 192, b: 169 },
  { code: '995', name: 'Electric Blue Dark', r: 0, g: 152, b: 203 },
  { code: '996', name: 'Electric Blue Medium', r: 0, g: 183, b: 228 },
  { code: '3011', name: 'Khaki Green Dark', r: 131, g: 125, b: 70 },
  { code: '3012', name: 'Khaki Green Medium', r: 161, g: 156, b: 90 },
  { code: '3013', name: 'Khaki Green Light', r: 186, g: 182, b: 124 },
  { code: '3021', name: 'Brown Gray Very Dark', r: 79, g: 71, b: 57 },
  { code: '3022', name: 'Brown Gray Medium', r: 142, g: 136, b: 110 },
  { code: '3023', name: 'Brown Gray Light', r: 176, g: 166, b: 141 },
  { code: '3024', name: 'Brown Gray Very Light', r: 214, g: 207, b: 191 },
  { code: '3031', name: 'Mocha Brown Very Dark', r: 79, g: 58, b: 33 },
  { code: '3032', name: 'Mocha Brown Medium', r: 172, g: 146, b: 113 },
  { code: '3033', name: 'Mocha Brown Very Light', r: 219, g: 202, b: 173 },
  { code: '3041', name: 'Antique Violet Medium', r: 152, g: 117, b: 141 },
  { code: '3042', name: 'Antique Violet Light', r: 194, g: 166, b: 186 },
  { code: '3045', name: 'Yellow Beige Dark', r: 189, g: 149, b: 88 },
  { code: '3046', name: 'Yellow Beige Medium', r: 217, g: 185, b: 123 },
  { code: '3047', name: 'Yellow Beige Light', r: 234, g: 212, b: 162 },
  { code: '3051', name: 'Green Gray Dark', r: 87, g: 96, b: 57 },
  { code: '3052', name: 'Green Gray Medium', r: 127, g: 139, b: 92 },
  { code: '3053', name: 'Green Gray', r: 152, g: 162, b: 118 },
  { code: '3064', name: 'Desert Sand', r: 196, g: 134, b: 100 },
  { code: '3072', name: 'Beaver Gray Very Light', r: 226, g: 225, b: 222 },
  { code: '3078', name: 'Golden Yellow Very Light', r: 254, g: 247, b: 194 },
  { code: '3325', name: 'Baby Blue Light', r: 178, g: 207, b: 232 },
  { code: '3326', name: 'Rose Light', r: 248, g: 181, b: 186 },
  { code: '3328', name: 'Salmon Dark', r: 213, g: 96, b: 87 },
  { code: '3340', name: 'Apricot Medium', r: 245, g: 120, b: 88 },
  { code: '3341', name: 'Apricot', r: 249, g: 157, b: 124 },
  { code: '3345', name: 'Hunter Green Dark', r: 40, g: 96, b: 37 },
  { code: '3346', name: 'Hunter Green', r: 60, g: 120, b: 55 },
  { code: '3347', name: 'Yellow Green Medium', r: 105, g: 153, b: 87 },
  { code: '3348', name: 'Yellow Green Light', r: 181, g: 213, b: 157 },
  { code: '3350', name: 'Dusty Rose Ultra Dark', r: 186, g: 64, b: 86 },
  { code: '3354', name: 'Dusty Rose Light', r: 226, g: 163, b: 163 },
  { code: '3362', name: 'Pine Green Dark', r: 77, g: 95, b: 59 },
  { code: '3363', name: 'Pine Green Medium', r: 101, g: 125, b: 80 },
  { code: '3364', name: 'Pine Green', r: 129, g: 158, b: 104 },
  { code: '3371', name: 'Black Brown', r: 38, g: 17, b: 6 },
  { code: '3607', name: 'Plum Light', r: 201, g: 67, b: 139 },
  { code: '3608', name: 'Plum Very Light', r: 222, g: 129, b: 181 },
  { code: '3609', name: 'Plum Ultra Light', r: 238, g: 172, b: 211 },
  { code: '3685', name: 'Mauve Very Dark', r: 143, g: 31, b: 51 },
  { code: '3687', name: 'Mauve', r: 199, g: 103, b: 114 },
  { code: '3688', name: 'Mauve Medium', r: 225, g: 160, b: 165 },
  { code: '3689', name: 'Mauve Light', r: 244, g: 197, b: 201 },
  { code: '3705', name: 'Melon Dark', r: 253, g: 98, b: 112 },
  { code: '3706', name: 'Melon Medium', r: 254, g: 150, b: 161 },
  { code: '3708', name: 'Melon Light', r: 255, g: 188, b: 197 },
  { code: '3712', name: 'Salmon Medium', r: 236, g: 126, b: 112 },
  { code: '3713', name: 'Salmon Very Light', r: 252, g: 210, b: 202 },
  { code: '3716', name: 'Dusty Rose Very Light', r: 253, g: 181, b: 184 },
  { code: '3721', name: 'Shell Pink Dark', r: 163, g: 82, b: 79 },
  { code: '3722', name: 'Shell Pink', r: 185, g: 104, b: 97 },
  { code: '3726', name: 'Antique Mauve Dark', r: 157, g: 94, b: 103 },
  { code: '3727', name: 'Antique Mauve Light', r: 228, g: 186, b: 191 },
  { code: '3731', name: 'Dusty Rose Very Dark', r: 207, g: 88, b: 107 },
  { code: '3733', name: 'Dusty Rose', r: 228, g: 131, b: 141 },
  { code: '3740', name: 'Antique Violet Dark', r: 118, g: 83, b: 110 },
  { code: '3743', name: 'Antique Violet Very Lt', r: 216, g: 204, b: 218 },
  { code: '3746', name: 'Blue Violet Dark', r: 112, g: 100, b: 161 },
  { code: '3747', name: 'Blue Violet Very Light', r: 208, g: 211, b: 234 },
  { code: '3750', name: 'Antique Blue Very Dark', r: 52, g: 77, b: 102 },
  { code: '3752', name: 'Antique Blue Very Light', r: 196, g: 211, b: 226 },
  { code: '3753', name: 'Antique Blue Ultra Vy Lt', r: 218, g: 228, b: 237 },
  { code: '3755', name: 'Baby Blue', r: 122, g: 168, b: 206 },
  { code: '3756', name: 'Baby Blue Ultra Vy Lt', r: 232, g: 244, b: 252 },
  { code: '3760', name: 'Wedgewood Medium', r: 65, g: 141, b: 173 },
  { code: '3761', name: 'Sky Blue Light', r: 151, g: 206, b: 224 },
  { code: '3765', name: 'Peacock Blue Very Dark', r: 28, g: 122, b: 145 },
  { code: '3766', name: 'Peacock Blue Light', r: 107, g: 193, b: 208 },
  { code: '3768', name: 'Gray Green Dark', r: 94, g: 128, b: 123 },
  { code: '3770', name: 'Tawny Very Light', r: 254, g: 229, b: 205 },
  { code: '3771', name: 'Terra Cotta Ultra Vy Lt', r: 243, g: 193, b: 168 },
  { code: '3772', name: 'Desert Sand Very Dark', r: 162, g: 100, b: 67 },
  { code: '3773', name: 'Desert Sand Med Dark', r: 180, g: 117, b: 81 },
  { code: '3774', name: 'Desert Sand Very Light', r: 236, g: 210, b: 191 },
  { code: '3776', name: 'Mahogany Light', r: 206, g: 121, b: 56 },
  { code: '3777', name: 'Terra Cotta Very Dark', r: 139, g: 49, b: 33 },
  { code: '3778', name: 'Terra Cotta Light', r: 217, g: 137, b: 112 },
  { code: '3779', name: 'Rosewood Ultra Vy Lt', r: 248, g: 210, b: 201 },
  { code: '3781', name: 'Mocha Brown Dark', r: 104, g: 80, b: 51 },
  { code: '3782', name: 'Mocha Brown Light', r: 208, g: 186, b: 154 },
  { code: '3787', name: 'Brown Gray Dark', r: 103, g: 96, b: 81 },
  { code: '3790', name: 'Beige Gray Ultra Dark', r: 109, g: 92, b: 70 },
  { code: '3799', name: 'Pewter Gray Very Dark', r: 60, g: 59, b: 61 },
  { code: '3801', name: 'Melon Very Dark', r: 226, g: 50, b: 68 },
  { code: '3802', name: 'Antique Mauve Very Dark', r: 121, g: 60, b: 70 },
  { code: '3803', name: 'Mauve Dark', r: 166, g: 45, b: 78 },
  { code: '3804', name: 'Cyclamen Pink Dark', r: 220, g: 36, b: 119 },
  { code: '3805', name: 'Cyclamen Pink', r: 235, g: 67, b: 140 },
  { code: '3806', name: 'Cyclamen Pink Light', r: 246, g: 127, b: 179 },
  { code: '3807', name: 'Cornflower Blue', r: 95, g: 107, b: 158 },
  { code: '3808', name: 'Turquoise Ultra Vy Dk', r: 53, g: 131, b: 144 },
  { code: '3809', name: 'Turquoise Very Dark', r: 62, g: 148, b: 162 },
  { code: '3810', name: 'Turquoise Dark', r: 73, g: 163, b: 176 },
  { code: '3811', name: 'Turquoise Very Light', r: 183, g: 226, b: 230 },
  { code: '3812', name: 'Sea Green Very Dark', r: 32, g: 153, b: 133 },
  { code: '3813', name: 'Blue Green Light', r: 176, g: 215, b: 196 },
  { code: '3814', name: 'Aquamarine', r: 61, g: 148, b: 122 },
  { code: '3815', name: 'Celadon Green Dark', r: 65, g: 122, b: 88 },
  { code: '3816', name: 'Celadon Green', r: 97, g: 160, b: 121 },
  { code: '3817', name: 'Celadon Green Light', r: 149, g: 194, b: 162 },
  { code: '3818', name: 'Emerald Green Ultra Vy Dk', r: 0, g: 101, b: 52 },
  { code: '3819', name: 'Moss Green Light', r: 219, g: 226, b: 111 },
  { code: '3820', name: 'Straw Dark', r: 220, g: 172, b: 74 },
  { code: '3821', name: 'Straw', r: 238, g: 197, b: 95 },
  { code: '3822', name: 'Straw Light', r: 244, g: 216, b: 133 },
  { code: '3823', name: 'Yellow Ultra Pale', r: 255, g: 251, b: 213 },
  { code: '3824', name: 'Apricot Light', r: 252, g: 184, b: 160 },
  { code: '3825', name: 'Pumpkin Pale', r: 253, g: 182, b: 122 },
  { code: '3826', name: 'Golden Brown', r: 181, g: 117, b: 48 },
  { code: '3827', name: 'Golden Brown Pale', r: 241, g: 193, b: 117 },
  { code: '3828', name: 'Hazel Nut Brown', r: 176, g: 128, b: 74 },
  { code: '3829', name: 'Old Gold Very Dark', r: 165, g: 119, b: 14 },
  { code: '3830', name: 'Terra Cotta', r: 188, g: 90, b: 64 },
  { code: '3831', name: 'Raspberry Dark', r: 178, g: 36, b: 62 },
  { code: '3832', name: 'Raspberry Medium', r: 211, g: 70, b: 94 },
  { code: '3833', name: 'Raspberry Light', r: 232, g: 130, b: 147 },
  { code: '3834', name: 'Grape Dark', r: 112, g: 55, b: 95 },
  { code: '3835', name: 'Grape Medium', r: 147, g: 88, b: 131 },
  { code: '3836', name: 'Grape Light', r: 190, g: 146, b: 178 },
  { code: '3837', name: 'Lavender Ultra Dark', r: 105, g: 49, b: 119 },
  { code: '3838', name: 'Lavender Blue Dark', r: 87, g: 112, b: 165 },
  { code: '3839', name: 'Lavender Blue Medium', r: 121, g: 148, b: 192 },
  { code: '3840', name: 'Lavender Blue Light', r: 165, g: 186, b: 218 },
  { code: '3841', name: 'Baby Blue Pale', r: 199, g: 219, b: 238 },
  { code: '3842', name: 'Wedgewood Dark', r: 42, g: 108, b: 147 },
  { code: '3843', name: 'Electric Blue', r: 0, g: 163, b: 218 },
  { code: '3844', name: 'Turquoise Bright Dark', r: 0, g: 178, b: 196 },
  { code: '3845', name: 'Turquoise Bright Medium', r: 0, g: 195, b: 210 },
  { code: '3846', name: 'Turquoise Bright Light', r: 0, g: 210, b: 220 },
  { code: '3847', name: 'Teal Green Dark', r: 44, g: 130, b: 113 },
  { code: '3848', name: 'Teal Green Medium', r: 76, g: 158, b: 141 },
  { code: '3849', name: 'Teal Green Light', r: 100, g: 182, b: 163 },
  { code: '3850', name: 'Bright Green Dark', r: 42, g: 140, b: 101 },
  { code: '3851', name: 'Bright Green Light', r: 58, g: 187, b: 147 },
  { code: '3852', name: 'Straw Very Dark', r: 200, g: 151, b: 52 },
  { code: '3853', name: 'Autumn Gold Dark', r: 240, g: 145, b: 54 },
  { code: '3854', name: 'Autumn Gold Medium', r: 246, g: 170, b: 86 },
  { code: '3855', name: 'Autumn Gold Light', r: 252, g: 203, b: 128 },
  { code: '3856', name: 'Mahogany Ultra Very Lt', r: 253, g: 213, b: 180 },
  { code: '3857', name: 'Rosewood Dark', r: 100, g: 33, b: 21 },
  { code: '3858', name: 'Rosewood Medium', r: 157, g: 76, b: 60 },
  { code: '3859', name: 'Rosewood Light', r: 195, g: 139, b: 116 },
  { code: '3860', name: 'Cocoa', r: 113, g: 81, b: 73 },
  { code: '3861', name: 'Cocoa Light', r: 163, g: 128, b: 118 },
  { code: '3862', name: 'Mocha Beige Dark', r: 131, g: 100, b: 66 },
  { code: '3863', name: 'Mocha Beige Medium', r: 163, g: 128, b: 89 },
  { code: '3864', name: 'Mocha Beige Light', r: 201, g: 174, b: 138 },
  { code: '3865', name: 'Winter White', r: 250, g: 248, b: 240 },
  { code: '3866', name: 'Mocha Brown Ultra Lt', r: 243, g: 237, b: 224 },
];

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  // Weighted Euclidean distance (human perception weighting)
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function findClosestDmc(r: number, g: number, b: number) {
  let best = DMC_COLORS[0];
  let bestDist = Infinity;
  for (const color of DMC_COLORS) {
    const dist = colorDistance(r, g, b, color.r, color.g, color.b);
    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  }
  return best;
}

// K-means color quantization
function kMeansQuantize(pixels: number[][], k: number, iterations = 10): number[][] {
  if (pixels.length === 0) return [];

  // Initialize centroids by picking random distinct pixels
  const centroids: number[][] = [];
  const used = new Set<number>();
  while (centroids.length < k && centroids.length < pixels.length) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push([...pixels[idx]]);
    }
  }

  let assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    // Assign each pixel to nearest centroid
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      const [r, g, b] = pixels[i];
      let minDist = Infinity;
      let minIdx = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = colorDistance(r, g, b, centroids[c][0], centroids[c][1], centroids[c][2]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = c;
        }
      }
      if (assignments[i] !== minIdx) {
        assignments[i] = minIdx;
        changed = true;
      }
    }
    if (!changed) break;

    // Update centroids
    for (let c = 0; c < centroids.length; c++) {
      const group = pixels.filter((_, i) => assignments[i] === c);
      if (group.length > 0) {
        centroids[c] = [
          Math.round(group.reduce((s, p) => s + p[0], 0) / group.length),
          Math.round(group.reduce((s, p) => s + p[1], 0) / group.length),
          Math.round(group.reduce((s, p) => s + p[2], 0) / group.length),
        ];
      }
    }
  }

  return centroids;
}

export const convertImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image uploaded' });
      return;
    }

    const width = Math.min(Math.max(parseInt(req.body.width) || 50, 5), 200);
    const height = Math.min(Math.max(parseInt(req.body.height) || 50, 5), 200);
    const numColors = Math.min(Math.max(parseInt(req.body.numColors) || 10, 2), 50);

    // Resize image to grid dimensions and get raw RGB pixels
    const { data } = await sharp(req.file.buffer)
      .resize(width, height, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Extract pixels as [r,g,b] arrays
    const pixels: number[][] = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Quantize to N colors
    const centroids = kMeansQuantize(pixels, numColors);

    // Map each centroid to nearest DMC color
    const palette = centroids.map((c) => {
      const dmc = findClosestDmc(c[0], c[1], c[2]);
      return {
        hex: `#${dmc.r.toString(16).padStart(2, '0')}${dmc.g.toString(16).padStart(2, '0')}${dmc.b.toString(16).padStart(2, '0')}`,
        dmcCode: dmc.code,
        dmcName: dmc.name,
        r: dmc.r,
        g: dmc.g,
        b: dmc.b,
        count: 0,
      };
    });

    // Remove duplicate DMC colors (two centroids may map to same DMC)
    const uniquePalette: typeof palette = [];
    const seenCodes = new Set<string>();
    const centroidToUnique: number[] = [];
    for (let i = 0; i < palette.length; i++) {
      if (!seenCodes.has(palette[i].dmcCode)) {
        seenCodes.add(palette[i].dmcCode);
        centroidToUnique.push(uniquePalette.length);
        uniquePalette.push(palette[i]);
      } else {
        const existingIdx = uniquePalette.findIndex((p) => p.dmcCode === palette[i].dmcCode);
        centroidToUnique.push(existingIdx);
      }
    }

    // Assign each pixel to nearest unique palette entry
    const gridData: number[] = [];
    for (const pixel of pixels) {
      const [r, g, b] = pixel;
      let minDist = Infinity;
      let minIdx = 0;
      for (let c = 0; c < uniquePalette.length; c++) {
        const dist = colorDistance(r, g, b, uniquePalette[c].r, uniquePalette[c].g, uniquePalette[c].b);
        if (dist < minDist) {
          minDist = dist;
          minIdx = c;
        }
      }
      gridData.push(minIdx);
      uniquePalette[minIdx].count++;
    }

    // Remove r,g,b fields from response palette
    const responsePalette = uniquePalette.map(({ hex, dmcCode, dmcName, count }) => ({
      hex,
      dmcCode,
      dmcName,
      count,
    }));

    res.json({ width, height, gridData, colors: responsePalette });
  } catch (error) {
    console.error('ConvertImage error:', error);
    res.status(500).json({ error: 'Image conversion failed' });
  }
};

export const saveImagePattern = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, width, height, gridData, colors, craftType } = req.body;

    if (!name || !width || !height || !gridData || !colors) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pattern = await prisma.imagePattern.create({
      data: {
        name,
        width: parseInt(width),
        height: parseInt(height),
        gridData: JSON.stringify(gridData),
        colors: JSON.stringify(colors),
        craftType: craftType || 'knitting',
        userId: req.userId!,
      },
    });

    res.status(201).json({ pattern });
  } catch (error) {
    console.error('SaveImagePattern error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getImagePatterns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patterns = await prisma.imagePattern.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, width: true, height: true, craftType: true, colors: true, createdAt: true },
    });

    const result = patterns.map((p) => ({
      ...p,
      colors: JSON.parse(p.colors),
    }));

    res.json({ patterns: result });
  } catch (error) {
    console.error('GetImagePatterns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getImagePattern = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pattern = await prisma.imagePattern.findFirst({
      where: { id, userId: req.userId },
    });

    if (!pattern) {
      res.status(404).json({ error: 'Pattern not found' });
      return;
    }

    res.json({
      pattern: {
        ...pattern,
        gridData: JSON.parse(pattern.gridData),
        colors: JSON.parse(pattern.colors),
      },
    });
  } catch (error) {
    console.error('GetImagePattern error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteImagePattern = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.imagePattern.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Pattern not found' });
      return;
    }

    await prisma.imagePattern.delete({ where: { id } });
    res.json({ message: 'Pattern deleted' });
  } catch (error) {
    console.error('DeleteImagePattern error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
